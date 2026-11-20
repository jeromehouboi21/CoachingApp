-- 040: Paket K, W3 (= R-1) – Einwilligung und Coaching-Vereinbarung v2.0, nur der Server setzt sie
--
-- 1. handle_new_user (Fassung aus 036): Zustimmungsfelder nur noch bei ausdrücklicher Zustimmung
--    in den Signup-Metadaten UND Version '2.0'. Andere Versionswerte werden ignoriert (Feld bleibt leer,
--    die App fragt dann nach). onboarding_data entfällt (Bereichswahl gibt es nicht mehr, W3-3).
-- 2. Schutz-Trigger (Fassung aus 038) + die vier Zustimmungsspalten: der Client schreibt sie nicht mehr.
-- 3. accept_consent_v2(): Zustimmung für Bestandsnutzer und Eingeladene (mit MFA-Prüfung).
--
-- Rückgängig machen:
--   handle_new_user in der Fassung aus 036 neu anlegen; protect_profile_privileges in der Fassung
--   aus 038 neu anlegen; drop function public.accept_consent_v2();
--   Achtung: Ein Frontend vor W3 schreibt die Zustimmungsfelder selbst – erst das Frontend zurückrollen.

-- ── 1. handle_new_user ───────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_consent   boolean := coalesce(m->>'consent_art9', '') = 'true'
                         and coalesce(m->>'consent_version', '') = '2.0';
  v_agreement boolean := coalesce(m->>'agreement_accepted', '') = 'true'
                         and coalesce(m->>'agreement_version', '') = '2.0';
begin
  insert into public.profiles (
    id, display_name, onboarding_completed,
    consent_given_at, consent_version,
    coaching_agreement_accepted_at, coaching_agreement_version,
    age_confirmed_at
  )
  values (
    new.id,
    left(m->>'display_name', 100),
    coalesce(m->>'onboarding_completed', '') = 'true',
    case when v_consent then now() end,
    case when v_consent then '2.0' end,
    case when v_agreement then now() end,
    case when v_agreement then '2.0' end,
    case when coalesce(m->>'age_confirmed', '') = 'true' then now() end
  );
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ── 2. Schutz-Trigger (Fassung aus 038 + Zustimmungsspalten) ────────────────
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
  or new.coaching_agreement_version     is distinct from old.coaching_agreement_version then
    raise exception 'profile_privileged_columns_are_server_only'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

-- ── 3. Zustimmung v2.0 nachholen (Bestandsnutzer, Eingeladene) ──────────────
-- Wird nur nach beiden Häkchen aufgerufen (Frontend); die Version legt der Server fest.
create or replace function public.accept_consent_v2()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not public.mfa_satisfied() then
    raise exception 'mfa_required' using errcode = '42501';
  end if;
  update public.profiles
     set consent_given_at = now(), consent_version = '2.0',
         coaching_agreement_accepted_at = now(), coaching_agreement_version = '2.0',
         onboarding_completed = true
   where id = auth.uid();
  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.accept_consent_v2() from public, anon;
grant execute on function public.accept_consent_v2() to authenticated;
