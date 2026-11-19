-- 036: S-11 Datenschutz-Korrekturen (Security-Paket C, Welle C-3)
-- Einwilligung beim Feedback (user_feedback + feedback_surveys), Altersbestätigung 18+,
-- Datenminimierung (consent_ip entfernt), Frist für feedback_surveys.
-- Nummer: ursprünglich 035 vorgesehen, 035 ist durch U3 belegt (Zielbild 2026-11).
--
-- Rückgängig (nur im Notfall, Reihenfolge beachten):
--   drop function if exists public.confirm_age();
--   alter table public.profiles add column if not exists consent_ip text;   -- Daten sind weg
--   Schutz-Trigger und handle_new_user aus 032 bzw. 027 wieder einspielen;
--   Policies user_feedback_insert_own / feedback_surveys_insert_own aus 025 wieder anlegen;
--   alter table public.user_feedback alter column consent_given set default true;
--   alter table public.feedback_surveys drop column if exists consent_given;
--   apply_retention aus 033 wieder einspielen.

-- ── 1. Feedback nur mit Einwilligung ─────────────────────────────────────────
alter table public.user_feedback alter column consent_given set default false;
drop policy if exists user_feedback_insert_own on public.user_feedback;
drop policy if exists user_feedback_insert_own_with_consent on public.user_feedback;
create policy user_feedback_insert_own_with_consent on public.user_feedback
  for insert to authenticated
  with check (user_id = (select auth.uid()) and consent_given = true);

-- Beta-Fragebogen: enthält Freitext → gleiche Einwilligungspflicht (Phase 0, Befund 4; Jerome: ja)
alter table public.feedback_surveys add column if not exists consent_given boolean not null default false;
drop policy if exists feedback_surveys_insert_own on public.feedback_surveys;
drop policy if exists feedback_surveys_insert_own_with_consent on public.feedback_surveys;
create policy feedback_surveys_insert_own_with_consent on public.feedback_surveys
  for insert to authenticated
  with check (user_id = (select auth.uid()) and consent_given = true);

-- ── 2. Altersbestätigung ─────────────────────────────────────────────────────
alter table public.profiles add column if not exists age_confirmed_at timestamptz;

-- ── 3. Schutz-Trigger ZUERST anpassen (Fassung aus 032; + age_confirmed_at, − consent_ip) ──
-- Reihenfolge wichtig: Referenziert der Trigger eine gelöschte Spalte, scheitert jedes Profil-Update.
-- handle_new_user und confirm_age laufen als SECURITY DEFINER (current_user ≠ authenticated).
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
    new.created_at                 := now();
    new.learning_opt_in            := false;
    new.learning_opt_in_updated_at := null;
    new.learning_opt_in_version    := null;
    new.age_confirmed_at           := null;
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
  or new.created_at                 is distinct from old.created_at
  or new.learning_opt_in            is distinct from old.learning_opt_in
  or new.learning_opt_in_updated_at is distinct from old.learning_opt_in_updated_at
  or new.learning_opt_in_version    is distinct from old.learning_opt_in_version
  or new.age_confirmed_at           is distinct from old.age_confirmed_at then
    raise exception 'profile_privileged_columns_are_server_only'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

-- ── 4. Danach die ungenutzte Spalte entfernen (Phase 0: keine Lese- oder Schreibstelle) ──
alter table public.profiles drop column if exists consent_ip;

-- ── 5. handle_new_user (Fassung aus 027) + age_confirmed_at aus den Signup-Metadaten ──
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
    coaching_agreement_accepted_at, coaching_agreement_version,
    age_confirmed_at
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
    v_agreement,
    case when coalesce(m->>'age_confirmed', '') = 'true' then now() end
  );
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ── 6. Bestandsnutzer bestätigen selbst ──────────────────────────────────────
create or replace function public.confirm_age()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  update public.profiles set age_confirmed_at = coalesce(age_confirmed_at, now()) where id = auth.uid();
end;
$$;
revoke all on function public.confirm_age() from public, anon;
grant execute on function public.confirm_age() to authenticated;

-- ── 7. Frist: Beta-Fragebogen wie Feedback nach 24 Monaten löschen ───────────
-- Der Einwilligungstext nennt 24 Monate; bisher löschte apply_retention (033) nur user_feedback.
-- Fassung aus 033, ergänzt um feedback_surveys (survey_deleted).
create or replace function public.apply_retention()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r jsonb := '{}'::jsonb;
  n integer;
begin
  -- Krisen-Ausschnitt: nach Sichtung oder spätestens nach 90 Tagen leeren
  update public.crisis_events set excerpt = null
   where excerpt is not null
     and (reviewed_by_jerome = true or detected_at < now() - interval '90 days');
  get diagnostics n = row_count; r := r || jsonb_build_object('crisis_excerpt_cleared', n);

  -- Krisen-Ereignis: 3 Jahre ab Ende des Kalenderjahres (März 2026 → gelöscht Anfang 2030)
  delete from public.crisis_events
   where date_trunc('year', detected_at) + interval '4 years' <= now();
  get diagnostics n = row_count; r := r || jsonb_build_object('crisis_deleted', n);

  delete from public.coach_reflections where created_at < now() - interval '12 months';
  get diagnostics n = row_count; r := r || jsonb_build_object('reflections_deleted', n);

  delete from public.supervision_logs where created_at < now() - interval '24 months';
  get diagnostics n = row_count; r := r || jsonb_build_object('supervision_deleted', n);

  delete from public.user_feedback where created_at < now() - interval '24 months';
  get diagnostics n = row_count; r := r || jsonb_build_object('feedback_deleted', n);

  delete from public.feedback_surveys where created_at < now() - interval '24 months';
  get diagnostics n = row_count; r := r || jsonb_build_object('survey_deleted', n);

  insert into public.app_logs (level, source, message, metadata)
  values ('info', 'retention', 'retention_applied', r);
  return r;
end;
$$;
revoke all on function public.apply_retention() from public, anon, authenticated;
