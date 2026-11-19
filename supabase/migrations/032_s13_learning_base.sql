-- 032: Lernbasis nur mit Opt-in und Prüfschritt (S-13, Paket B Welle 3)
--
-- - profiles.learning_opt_in (+ Zeitstempel, Version), nur über RPC set_learning_opt_in änderbar
-- - experience_patterns.source_user_id (Zuordnung für Rücknahme/Löschung, CASCADE) + review_status
-- - Bestand ohne Zuordnung wird gelöscht (Entscheidung D-2)
-- - match_experiences findet nur geprüfte Einträge und liefert source_user_id nicht aus
-- Voraussetzung: 031 (Welle 2b) ist eingespielt.

-- ── 1. Opt-in im Profil ─────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists learning_opt_in            boolean not null default false,
  add column if not exists learning_opt_in_updated_at timestamptz,
  add column if not exists learning_opt_in_version    text;

-- ── 2. Lernbasis: Zuordnung + Prüfstatus ────────────────────────────────────
alter table public.experience_patterns
  add column if not exists source_user_id uuid references auth.users (id) on delete cascade,
  add column if not exists review_status  text not null default 'pending'
    check (review_status in ('pending', 'approved', 'rejected')),
  add column if not exists reviewed_at    timestamptz;

create index if not exists experience_patterns_source_user_idx
  on public.experience_patterns (source_user_id);

-- D-2: Bestand ohne Opt-in und ohne Zuordnung entfernen
delete from public.experience_patterns where source_user_id is null;

-- Keine Client-Rechte (Mig. 025 hat das bereits so gesetzt; hier zur Sicherheit wiederholt)
revoke all on public.experience_patterns from public, anon, authenticated;

-- ── 3. Zustimmung setzen / zurücknehmen ─────────────────────────────────────
-- Rücknahme löscht die eigenen Beiträge in derselben Transaktion.
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

-- ── 4. Schutz-Trigger: Opt-in-Felder nur über die RPC ───────────────────────
-- Fassung aus 027 + learning_opt_in, learning_opt_in_updated_at, learning_opt_in_version.
-- Die RPC läuft als SECURITY DEFINER (current_user ≠ authenticated) und ist nicht betroffen.
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Client-Inserts sind seit 025 ohnehin nicht erlaubt; das hier ist die zweite Linie.
    new.is_admin                   := false;
    new.is_beta_tester             := false;
    new.plan                       := 'free';
    new.session_limit              := 20;
    new.sessions_used_this_month   := 0;
    new.invited_at                 := null;
    new.invited_by                 := null;
    new.consent_ip                 := null;
    new.created_at                 := now();
    new.learning_opt_in            := false;
    new.learning_opt_in_updated_at := null;
    new.learning_opt_in_version    := null;
    return new;
  end if;

  if new.id                         is distinct from old.id
  or new.is_admin                   is distinct from old.is_admin
  or new.is_beta_tester             is distinct from old.is_beta_tester
  or new.plan                       is distinct from old.plan
  or new.session_limit              is distinct from old.session_limit
  or new.sessions_used_this_month   is distinct from old.sessions_used_this_month
  or new.invited_at                 is distinct from old.invited_at
  or new.invited_by                 is distinct from old.invited_by
  or new.consent_ip                 is distinct from old.consent_ip
  or new.created_at                 is distinct from old.created_at
  or new.learning_opt_in            is distinct from old.learning_opt_in
  or new.learning_opt_in_updated_at is distinct from old.learning_opt_in_updated_at
  or new.learning_opt_in_version    is distinct from old.learning_opt_in_version then
    raise exception 'profile_privileged_columns_are_server_only'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

-- ── 5. RAG-Suche: nur geprüfte Einträge, ohne Zuordnung in der Rückgabe ─────
create or replace function public.match_experiences(
  query_embedding vector(1536),
  match_threshold float default 0.78,
  match_count     int default 3
)
returns table(
  context      text,
  pattern      text,
  what_helped  text,
  resistance   text,
  similarity   float
)
language sql
stable
set search_path = public
as $$
  select
    e.context,
    e.pattern,
    e.what_helped,
    e.resistance,
    1 - (e.embedding <=> query_embedding) as similarity
  from public.experience_patterns e
  where e.review_status = 'approved'
    and e.embedding is not null
    and 1 - (e.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;

revoke all on function public.match_experiences(vector, double precision, integer) from public, anon, authenticated;
grant execute on function public.match_experiences(vector, double precision, integer) to service_role;
