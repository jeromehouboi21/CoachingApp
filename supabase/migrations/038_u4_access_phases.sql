-- 038: U4 – Kennenlernen, Ruhemodus, Begleitung, Kappung (Handoff U4, freigegeben 19.11.2026)
--
-- Regeln (E-U4-1 b, E-U4-3, E-U4-8), einzige Quelle: access_state_for(uid)
--   premium  → Begleitung: Starts unbegrenzt, keine Kappung
--   tester   → Starts begrenzt durch session_limit (null = unbegrenzt), keine Kappung;
--              Phase „begleitung“, solange Starts übrig sind, sonst „ruhemodus“
--   sonst    → Starts begrenzt durch session_limit (null = unbegrenzt), Kappung 100 Nachrichten
--              je Gespräch; Phase „kennenlernen“, solange Starts übrig sind, sonst „ruhemodus“
-- Gezählt wird ein Start einmal je Gespräch (session_counted_at, wie seit 023), jetzt insgesamt
-- in profiles.trial_sessions_used statt pro Monat. Neue Spalte → Bestandsnutzer starten bei 0 (5.5).
--
-- Rückgängig machen:
--   consume_session in der Fassung aus 023 neu anlegen; protect_profile_privileges in der Fassung
--   aus 036; drop function public.get_access_state(); drop function public.access_state_for(uuid);
--   alter table public.profiles alter column session_limit set default 20;
--   alter table public.profiles drop column trial_sessions_used;
--   Cron reset-monthly-sessions wie in 023 neu anlegen.

-- ── 1. Neue Zählspalte (E-U4-2) ─────────────────────────────────────────────
alter table public.profiles add column if not exists trial_sessions_used integer not null default 0;

-- ── 2. Standardgrenze 3 (E-U4-3) ────────────────────────────────────────────
-- null bleibt „unbegrenzt“ (Ausnahme durch den Admin). Nur free-Konten mit dem alten Default 20
-- bekommen 3; vom Admin gesetzte Werte und Tester bleiben unverändert.
alter table public.profiles alter column session_limit set default 3;
update public.profiles set session_limit = 3
where coalesce(plan, 'free') = 'free' and session_limit = 20;

-- ── 3. Schutz-Trigger (Fassung aus 036 + trial_sessions_used) ───────────────
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
    new.session_limit              := 3;
    new.sessions_used_this_month   := 0;
    new.trial_sessions_used        := 0;
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
  or new.trial_sessions_used        is distinct from old.trial_sessions_used
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

-- ── 4. Regeln an einer Stelle (E-U4-6 a) ────────────────────────────────────
create or replace function public.access_state_for(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c_cap constant integer := 100;   -- Kappung je Gespräch ohne Begleitung (O-2: Startwert)
  v_plan text;
  v_limit integer;
  v_used integer;
  v_has_starts boolean;
  v_phase text;
begin
  select coalesce(plan, 'free'), session_limit, coalesce(trial_sessions_used, 0)
    into v_plan, v_limit, v_used
  from public.profiles where id = p_user_id;
  if not found then
    return null;
  end if;

  v_has_starts := v_plan = 'premium' or v_limit is null or v_used < v_limit;
  v_phase := case
    when v_plan = 'premium' then 'begleitung'
    when not v_has_starts then 'ruhemodus'
    when v_plan = 'tester' then 'begleitung'
    else 'kennenlernen'
  end;

  return jsonb_build_object(
    'phase',        v_phase,
    'starts_used',  v_used,
    'starts_limit', case when v_plan = 'premium' then null else v_limit end,
    'can_start',    v_has_starts,
    'cap',          case when v_plan in ('premium', 'tester') then null else c_cap end
  );
end;
$$;
revoke all on function public.access_state_for(uuid) from public, anon, authenticated;
grant execute on function public.access_state_for(uuid) to service_role;

-- Für das Frontend: nur die eigene Zeile, mit MFA-Prüfung (C-5)
create or replace function public.get_access_state()
returns jsonb
language plpgsql
stable
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
  return public.access_state_for(auth.uid());
end;
$$;
revoke all on function public.get_access_state() from public, anon;
grant execute on function public.get_access_state() to authenticated;

-- ── 5. consume_session (Fassung aus 023, Zählung gesamt, Regeln aus access_state_for) ──
create or replace function public.consume_session(p_conversation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_counted timestamptz;
  v_state jsonb;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select session_counted_at into v_counted
  from public.conversations
  where id = p_conversation_id and user_id = v_uid
  for update;

  if not found then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_counted is not null then
    return jsonb_build_object('allowed', true, 'counted', false);
  end if;

  -- Profilzeile sperren, damit parallele Starts nicht beide durchrutschen
  perform 1 from public.profiles where id = v_uid for update;
  v_state := public.access_state_for(v_uid);

  if not coalesce((v_state->>'can_start')::boolean, false) then
    return jsonb_build_object('allowed', false, 'counted', false,
                              'used', v_state->'starts_used', 'limit', v_state->'starts_limit',
                              'phase', v_state->>'phase');
  end if;

  update public.conversations set session_counted_at = now() where id = p_conversation_id;
  update public.profiles set trial_sessions_used = coalesce(trial_sessions_used, 0) + 1
  where id = v_uid;

  return jsonb_build_object('allowed', true, 'counted', true,
                            'used', coalesce((v_state->>'starts_used')::integer, 0) + 1,
                            'limit', v_state->'starts_limit');
end;
$$;
revoke all on function public.consume_session(uuid) from public, anon;
grant execute on function public.consume_session(uuid) to authenticated, service_role;

-- ── 6. Monats-Reset abschalten (die neue Zählung läuft gesamt) ──────────────
select cron.unschedule('reset-monthly-sessions')
where exists (select 1 from cron.job where jobname = 'reset-monthly-sessions');
