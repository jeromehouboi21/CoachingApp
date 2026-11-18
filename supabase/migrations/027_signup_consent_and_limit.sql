-- 027: Neue Nutzer bekommen 20 Gespräche/Monat; Zustimmungen bei der Registrierung
--      werden vom Auth-Trigger geschrieben (Fix "Passwort muss zweimal gesetzt werden").
--
-- Hintergrund Fix: Step4Auth hat Einwilligung, Coaching-Vereinbarung und Onboarding-Daten
-- per Client-Update direkt nach signUp() gespeichert. Bei aktiver E-Mail-Bestätigung gibt
-- es zu dem Zeitpunkt keine Session → Update unmöglich. Nach dem Bestätigungslink fehlte
-- deshalb die Vereinbarung, die App schickte zurück ins Onboarding und dort in den Flow für
-- eingeladene Nutzer (Vereinbarung + Passwort setzen).
-- Neu: Das Frontend gibt die Angaben als Auth-Metadaten an signUp() mit; handle_new_user
-- schreibt sie beim Anlegen des Profils. Zeitstempel setzt der Server (now()).
-- Eingeladene Nutzer (admin-invite-user) haben diese Metadaten nicht und durchlaufen
-- weiterhin Vereinbarung + Passwort-Vergabe.

-- ── 1. Gesprächslimit für neue Nutzer: 20 ───────────────────────────────────
alter table public.profiles alter column session_limit set default 20;

-- Schutz-Trigger (aus 024): Default für Client-Inserts ebenfalls auf 20
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
    new.is_admin                 := false;
    new.is_beta_tester           := false;
    new.plan                     := 'free';
    new.session_limit            := 20;
    new.sessions_used_this_month := 0;
    new.invited_at               := null;
    new.invited_by               := null;
    new.consent_ip               := null;
    new.created_at               := now();
    return new;
  end if;

  if new.id                       is distinct from old.id
  or new.is_admin                 is distinct from old.is_admin
  or new.is_beta_tester           is distinct from old.is_beta_tester
  or new.plan                     is distinct from old.plan
  or new.session_limit            is distinct from old.session_limit
  or new.sessions_used_this_month is distinct from old.sessions_used_this_month
  or new.invited_at               is distinct from old.invited_at
  or new.invited_by               is distinct from old.invited_by
  or new.consent_ip               is distinct from old.consent_ip
  or new.created_at               is distinct from old.created_at then
    raise exception 'profile_privileged_columns_are_server_only'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

-- ── 2. handle_new_user: Zustimmungen aus den Registrierungs-Metadaten übernehmen ──
-- Nur bekannte Felder, Längen begrenzt; privilegierte Felder (plan, session_limit …)
-- werden bewusst NICHT aus Metadaten gelesen.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_consent text := left(m->>'consent_version', 20);
  v_agreement text := left(m->>'coaching_agreement_version', 20);
begin
  insert into public.profiles (
    id, display_name, onboarding_completed, onboarding_data,
    consent_given_at, consent_version,
    coaching_agreement_accepted_at, coaching_agreement_version
  )
  values (
    new.id,
    left(m->>'display_name', 100),
    coalesce(m->>'onboarding_completed', '') = 'true',
    case when jsonb_typeof(m->'onboarding_data') = 'object'
         then jsonb_build_object('area', left(m->'onboarding_data'->>'area', 100))
         else null end,
    case when v_consent is not null then now() end,
    v_consent,
    case when v_agreement is not null then now() end,
    v_agreement
  );
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
