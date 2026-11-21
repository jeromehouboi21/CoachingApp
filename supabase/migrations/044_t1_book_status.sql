-- 044: T1 Buch-Seite – Buch-Status am Profil (Handoff handoff-t1-buch-seite.md v1, J-T1 21.11.2026)
--
-- Inhalt:
--   1. profiles.book_status / book_progress / book_status_at + CHECK-Constraints
--   2. Schutz-Trigger (Fassung aus 040, vollständig) + die drei book_*-Spalten auf der Sperrliste
--   3. RPC set_book_status(p_status, p_progress): einziger Schreibweg (SECURITY DEFINER; der Trigger
--      lässt Funktionen mit current_user ≠ authenticated/anon durch, wie bei set_learning_opt_in)
--
-- RLS auf profiles bleibt unverändert. Export (alle profiles-Spalten) und Löschung (Zeile in profiles)
-- erfassen die Spalten automatisch.
--
-- Rückgängig machen:
--   drop function if exists public.set_book_status(text, int);
--   protect_profile_privileges in der Fassung aus 040_k_consent_v2.sql neu anlegen;
--   alter table public.profiles
--     drop constraint if exists profiles_book_progress_consistent,
--     drop constraint if exists profiles_book_progress_check,
--     drop constraint if exists profiles_book_status_check,
--     drop column if exists book_status_at,
--     drop column if exists book_progress,
--     drop column if exists book_status;

-- ── 1. Spalten und Constraints ───────────────────────────────────────────────
alter table public.profiles
  add column if not exists book_status    text,
  add column if not exists book_progress  int,
  add column if not exists book_status_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_book_status_check,
  drop constraint if exists profiles_book_progress_check,
  drop constraint if exists profiles_book_progress_consistent;

alter table public.profiles
  add constraint profiles_book_status_check
    check (book_status is null or book_status in ('read', 'reading', 'not_yet')),
  add constraint profiles_book_progress_check
    check (book_progress is null or book_progress between 1 and 7),
  -- Lesestand gibt es genau dann, wenn der Status 'reading' ist
  add constraint profiles_book_progress_consistent
    check (
      (book_status = 'reading' and book_progress is not null)
      or (book_status is distinct from 'reading' and book_progress is null)
    );

comment on column public.profiles.book_status is
  'Selbstauskunft zum Buch "Friedensstifter": read | reading | not_yet; null = nie angegeben (wie not_yet behandeln)';
comment on column public.profiles.book_progress is
  'Nur bei reading: Teil 1-7, in dem der Nutzer gerade ist (T1-8)';
comment on column public.profiles.book_status_at is
  'Zeitpunkt der letzten Änderung von book_status/book_progress';

-- ── 2. Schutz-Trigger (Fassung aus 040 + book_*) ────────────────────────────
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
    new.is_admin                       := false;
    new.is_beta_tester                 := false;
    new.plan                           := 'free';
    new.session_limit                  := 3;
    new.sessions_used_this_month       := 0;
    new.trial_sessions_used            := 0;
    new.invited_at                     := null;
    new.invited_by                     := null;
    new.created_at                     := now();
    new.learning_opt_in                := false;
    new.learning_opt_in_updated_at     := null;
    new.learning_opt_in_version        := null;
    new.age_confirmed_at               := null;
    new.consent_given_at               := null;
    new.consent_version                := null;
    new.coaching_agreement_accepted_at := null;
    new.coaching_agreement_version     := null;
    new.book_status                    := null;   -- 044
    new.book_progress                  := null;   -- 044
    new.book_status_at                 := null;   -- 044
    return new;
  end if;

  if new.id                             is distinct from old.id
  or new.is_admin                       is distinct from old.is_admin
  or new.is_beta_tester                 is distinct from old.is_beta_tester
  or new.plan                           is distinct from old.plan
  or new.session_limit                  is distinct from old.session_limit
  or new.sessions_used_this_month       is distinct from old.sessions_used_this_month
  or new.trial_sessions_used            is distinct from old.trial_sessions_used
  or new.invited_at                     is distinct from old.invited_at
  or new.invited_by                     is distinct from old.invited_by
  or new.created_at                     is distinct from old.created_at
  or new.learning_opt_in                is distinct from old.learning_opt_in
  or new.learning_opt_in_updated_at     is distinct from old.learning_opt_in_updated_at
  or new.learning_opt_in_version        is distinct from old.learning_opt_in_version
  or new.age_confirmed_at               is distinct from old.age_confirmed_at
  or new.consent_given_at               is distinct from old.consent_given_at
  or new.consent_version                is distinct from old.consent_version
  or new.coaching_agreement_accepted_at is distinct from old.coaching_agreement_accepted_at
  or new.coaching_agreement_version     is distinct from old.coaching_agreement_version
  or new.book_status                    is distinct from old.book_status        -- 044
  or new.book_progress                  is distinct from old.book_progress      -- 044
  or new.book_status_at                 is distinct from old.book_status_at then -- 044
    raise exception 'profile_privileged_columns_are_server_only'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

-- ── 3. RPC set_book_status (Muster wie set_learning_opt_in / confirm_age) ───
create or replace function public.set_book_status(p_status text, p_progress int default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if not public.mfa_satisfied() then
    raise exception 'mfa_required' using errcode = '42501';
  end if;

  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if p_status is null or p_status not in ('read', 'reading', 'not_yet') then
    raise exception 'invalid_book_status' using errcode = '22023';
  end if;

  if p_status = 'reading' then
    if p_progress is null or p_progress < 1 or p_progress > 7 then
      raise exception 'invalid_book_progress' using errcode = '22023';
    end if;
  elsif p_progress is not null then
    raise exception 'invalid_book_progress' using errcode = '22023';
  end if;

  update public.profiles
     set book_status    = p_status,
         book_progress  = case when p_status = 'reading' then p_progress end,
         book_status_at = now()
   where id = v_uid;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_book_status(text, int) from public, anon;
grant execute on function public.set_book_status(text, int) to authenticated;
