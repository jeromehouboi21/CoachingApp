-- 037: S-06b (Paket C, Welle C-5) – Zweiter Faktor für alle Nutzer (freiwillig)
--
-- Wer einen verifizierten Faktor hat, braucht eine aal2-Sitzung – auch direkt an der Datenbank:
--   1. mfa_satisfied(): aal2 im JWT ODER kein verifizierter Faktor
--   2. Restriktive Policy mfa_required auf jeder Tabelle mit Client-Rechten (Audit A, ohne app_logs,
--      damit das Logging vor der Code-Eingabe funktioniert)
--   3. Client-RPCs mit SECURITY DEFINER (set_learning_opt_in, confirm_age) prüfen mfa_satisfied() zuerst
--   4. mfa_recovery_codes: nur HMAC-Hashes, nur service_role (Function mfa-recovery)
--
-- Deploy-Reihenfolge (Handoff 7.1 / J-C6): Frontend → Functions → diese Migration.
--
-- Rückgängig machen:
--   do $$ declare t text; begin foreach t in array array['profiles','conversations','messages','insights',
--     'user_memory','inner_voices','coach_file_entries','coachee_profile','session_notes','pattern_references',
--     'user_feedback','feedback_surveys'] loop execute format('drop policy if exists mfa_required on public.%I', t);
--     end loop; end $$;
--   set_learning_opt_in in der Fassung aus 032, confirm_age in der Fassung aus 036 neu anlegen;
--   drop table if exists public.mfa_recovery_codes; drop function if exists public.mfa_satisfied();

-- ── 1. Prüffunktion ─────────────────────────────────────────────────────────
create or replace function public.mfa_satisfied()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal') = 'aal2', false)
      or not exists (
        select 1 from auth.mfa_factors f
        where f.user_id = (select auth.uid()) and f.status = 'verified'
      );
$$;
revoke all on function public.mfa_satisfied() from public, anon;
grant execute on function public.mfa_satisfied() to authenticated;

-- ── 2. Restriktive Policies ─────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'conversations', 'messages', 'insights', 'user_memory', 'inner_voices',
    'coach_file_entries', 'coachee_profile', 'session_notes', 'pattern_references',
    'user_feedback', 'feedback_surveys'
  ] loop
    execute format('drop policy if exists mfa_required on public.%I', t);
    execute format(
      'create policy mfa_required on public.%I as restrictive for all to authenticated '
      'using ((select public.mfa_satisfied())) with check ((select public.mfa_satisfied()))', t);
  end loop;
end $$;

-- ── 3. Client-RPCs ──────────────────────────────────────────────────────────
-- Fassung aus 032, ergänzt um die MFA-Prüfung als ersten Schritt.
create or replace function public.set_learning_opt_in(p_opt_in boolean, p_version text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_deleted integer := 0;
begin
  if not public.mfa_satisfied() then
    raise exception 'mfa_required' using errcode = '42501';
  end if;
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_opt_in is null then
    raise exception 'invalid_opt_in' using errcode = '22023';
  end if;
  if p_opt_in and (p_version is null or length(p_version) = 0 or length(p_version) > 20) then
    raise exception 'invalid_version' using errcode = '22023';
  end if;

  update public.profiles
     set learning_opt_in            = p_opt_in,
         learning_opt_in_updated_at = now(),
         learning_opt_in_version    = case when p_opt_in then p_version else learning_opt_in_version end
   where id = v_uid;

  if not p_opt_in then
    delete from public.experience_patterns where source_user_id = v_uid;
    get diagnostics v_deleted = row_count;
  end if;

  return jsonb_build_object('opt_in', p_opt_in, 'deleted', v_deleted);
end;
$$;
revoke all on function public.set_learning_opt_in(boolean, text) from public, anon;
grant execute on function public.set_learning_opt_in(boolean, text) to authenticated;

-- Fassung aus 036, ergänzt um die MFA-Prüfung als ersten Schritt.
create or replace function public.confirm_age()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.mfa_satisfied() then
    raise exception 'mfa_required' using errcode = '42501';
  end if;
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  update public.profiles set age_confirmed_at = coalesce(age_confirmed_at, now()) where id = auth.uid();
end;
$$;
revoke all on function public.confirm_age() from public, anon;
grant execute on function public.confirm_age() to authenticated;

-- ── 4. Wiederherstellungscodes (nur Hash, nur service_role) ─────────────────
-- Personenbezug: user_id → ON DELETE CASCADE an auth.users (Löschtest erfasst die Spalte automatisch),
-- im Datenexport ohne code_hash. Benutzte Codes entfernt mfa-recovery beim Wiederherstellen.
create table if not exists public.mfa_recovery_codes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  code_hash  text not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
alter table public.mfa_recovery_codes enable row level security;
revoke all on public.mfa_recovery_codes from public, anon, authenticated;
grant all on public.mfa_recovery_codes to service_role;
create index if not exists mfa_recovery_codes_user_idx on public.mfa_recovery_codes (user_id);
