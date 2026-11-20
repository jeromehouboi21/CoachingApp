-- 042: Paket Z – Zahlung und Abo (Handoff handoff-paket-z-zahlung.md v1.1, freigegeben 20.11.2026)
--
-- Inhalt:
--   1. Tabellen subscriptions, message_quota_periods, message_charges, stripe_events
--      (nur service_role, RLS an, Cascade zu profiles/conversations)
--   2. Regeln an einer Stelle: quota_limit_for / quota_grace / quota_warn_percent (Z-3)
--   3. current_quota_period: Monatszeitraum ab dem Ankertag des Abos
--   4. access_state_for (Fassung 038 + Abo und Kontingent), consume_session (Fassung 038 + reason/period)
--   5. consume_message / refund_message (Buchungsjournal, nur service_role)
--   6. apply_retention (Fassung 036 + neue Tabellen)
--
-- plan bleibt server-only (Schutz-Trigger aus 038/040 unverändert). plan setzt nur stripe-webhook.
--
-- Rückgängig machen:
--   access_state_for und consume_session in der Fassung aus 038 neu anlegen;
--   apply_retention in der Fassung aus 036 neu anlegen;
--   drop function public.refund_message(uuid, uuid);
--   drop function public.consume_message(uuid, uuid, uuid);
--   drop function public.current_quota_period(timestamptz, timestamptz);
--   drop function public.quota_warn_percent(); drop function public.quota_grace();
--   drop function public.quota_limit_for(text);
--   drop table public.message_charges; drop table public.message_quota_periods;
--   drop table public.stripe_events; drop table public.subscriptions;
--   Vorher Abos bei Stripe beenden bzw. Plan 'premium' der Abo-Kunden prüfen.

-- ── 1. Tabellen ──────────────────────────────────────────────────────────────

-- Eine Zeile pro Nutzer: das jeweils aktuelle Abo. Anzeige nur über get_access_state().
create table if not exists public.subscriptions (
  user_id                uuid primary key references public.profiles (id) on delete cascade,
  stripe_customer_id     text unique not null,
  stripe_subscription_id text unique,
  tier                   text check (tier in ('begleitung', 'intensiv')),
  billing_interval       text check (billing_interval in ('month', 'year')),
  status                 text,                      -- Stripe-Status 1:1
  quota_anchor           timestamptz,               -- Stripe start_date, Ankertag der Monatszeiträume
  current_period_end     timestamptz,               -- Ende des bezahlten Zeitraums (max. über die Positionen)
  cancel_at_period_end   boolean not null default false,   -- endet (cancel_at_period_end ODER cancel_at)
  cancel_at              timestamptz,               -- Stripe cancel_at (flexibler Abrechnungsmodus)
  pending_tier           text check (pending_tier in ('begleitung', 'intensiv')),   -- Herabstufung zum Periodenende (Z-6)
  updated_at             timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
revoke all on public.subscriptions from public, anon, authenticated;
grant all on public.subscriptions to service_role;

-- Monatskontingent je Zeitraum
create table if not exists public.message_quota_periods (
  user_id               uuid not null references public.profiles (id) on delete cascade,
  period_start          timestamptz not null,
  period_end            timestamptz not null,
  used                  integer not null default 0 check (used >= 0),
  grace_conversation_id uuid references public.conversations (id) on delete set null,
  grace_used            integer not null default 0 check (grace_used >= 0),
  warned_at             timestamptz,
  primary key (user_id, period_start)
);
alter table public.message_quota_periods enable row level security;
revoke all on public.message_quota_periods from public, anon, authenticated;
grant all on public.message_quota_periods to service_role;

-- Buchungsjournal: genau eine Buchung pro Nutzernachricht
create table if not exists public.message_charges (
  conversation_id   uuid not null references public.conversations (id) on delete cascade,
  client_message_id uuid not null,
  user_id           uuid not null references public.profiles (id) on delete cascade,
  period_start      timestamptz not null,
  kind              text not null check (kind in ('quota', 'grace')),
  charged_at        timestamptz not null default now(),
  primary key (conversation_id, client_message_id)
);
create index if not exists message_charges_user_idx on public.message_charges (user_id, charged_at);
alter table public.message_charges enable row level security;
revoke all on public.message_charges from public, anon, authenticated;
grant all on public.message_charges to service_role;

-- Webhook-Idempotenz, ohne Personenbezug
create table if not exists public.stripe_events (
  event_id     text primary key,
  type         text not null,
  received_at  timestamptz not null default now(),
  processed_at timestamptz
);
alter table public.stripe_events enable row level security;
revoke all on public.stripe_events from public, anon, authenticated;
grant all on public.stripe_events to service_role;

-- ── 2. Regeln an einer Stelle (Z-3) ─────────────────────────────────────────
-- Einzige Stelle mit diesen Zahlen. Änderung = neue Migration.
create or replace function public.quota_limit_for(p_tier text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_tier
    when 'begleitung' then 150
    when 'intensiv'   then 800
    else null
  end;
$$;

create or replace function public.quota_grace()
returns integer language sql immutable set search_path = '' as $$ select 10 $$;

create or replace function public.quota_warn_percent()
returns integer language sql immutable set search_path = '' as $$ select 80 $$;

revoke all on function public.quota_limit_for(text) from public, anon, authenticated;
revoke all on function public.quota_grace() from public, anon, authenticated;
revoke all on function public.quota_warn_percent() from public, anon, authenticated;
grant execute on function public.quota_limit_for(text) to service_role;
grant execute on function public.quota_grace() to service_role;
grant execute on function public.quota_warn_percent() to service_role;

-- ── 3. Monatszeitraum ab dem Ankertag ───────────────────────────────────────
-- start = anchor + n Monate mit dem größten n, für das start <= p_at gilt. Gerechnet in UTC.
-- Postgres kürzt auf das Monatsende (31.01. + 1 Monat = 28./29.02.), gezählt wird immer ab dem Anker.
create or replace function public.current_quota_period(
  p_anchor timestamptz, p_at timestamptz,
  out period_start timestamptz, out period_end timestamptz)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_a timestamp := p_anchor at time zone 'UTC';
  v_t timestamp := p_at at time zone 'UTC';
  n integer;
begin
  n := ((extract(year from v_t) - extract(year from v_a)) * 12
        + (extract(month from v_t) - extract(month from v_a)))::integer;
  if n < 0 then n := 0; end if;
  while n > 0 and v_a + make_interval(months => n) > v_t loop
    n := n - 1;
  end loop;
  period_start := (v_a + make_interval(months => n)) at time zone 'UTC';
  period_end   := (v_a + make_interval(months => n + 1)) at time zone 'UTC';
end;
$$;
revoke all on function public.current_quota_period(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.current_quota_period(timestamptz, timestamptz) to service_role;

-- ── 4a. access_state_for (Fassung 038 + Abo und Kontingent) ─────────────────
-- Bisherige Felder unverändert. Neu (nur bei premium mit Abo, sonst null/false):
--   tier, period_end (Ende des bezahlten Zeitraums), cancel_at_period_end, pending_tier,
--   quota_resets_at (Beginn des nächsten Kontingents), messages_left, quota_reached.
-- can_start ist false, wenn das Kontingent aufgebraucht ist (Kulanz nur im laufenden Gespräch).
-- phase bleibt 'begleitung'; das Frontend unterscheidet über quota_reached.
create or replace function public.access_state_for(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c_cap constant integer := 100;   -- Kappung je Gespräch ohne Begleitung (038)
  v_plan text;
  v_limit integer;
  v_used integer;
  v_has_starts boolean;
  v_phase text;
  v_tier text;
  v_anchor timestamptz;
  v_period_end timestamptz;
  v_cancel_flag boolean;
  v_cancel_at timestamptz;
  v_pending text;
  v_q_start timestamptz;
  v_q_end timestamptz;
  v_quota_limit integer;
  v_quota_used integer;
  v_quota_reached boolean := false;
  v_has_quota boolean := false;
begin
  select coalesce(plan, 'free'), session_limit, coalesce(trial_sessions_used, 0)
    into v_plan, v_limit, v_used
  from public.profiles where id = p_user_id;
  if not found then
    return null;
  end if;

  if v_plan = 'premium' then
    select tier, quota_anchor, current_period_end, cancel_at_period_end, cancel_at, pending_tier
      into v_tier, v_anchor, v_period_end, v_cancel_flag, v_cancel_at, v_pending
    from public.subscriptions where user_id = p_user_id;
    if found and v_anchor is not null and v_tier is not null then
      v_has_quota := true;
      select cq.period_start, cq.period_end into v_q_start, v_q_end
      from public.current_quota_period(v_anchor, now()) cq;
      v_quota_limit := public.quota_limit_for(v_tier);
      select coalesce(max(used), 0) into v_quota_used
      from public.message_quota_periods
      where user_id = p_user_id and period_start = v_q_start;
      v_quota_reached := v_quota_used >= v_quota_limit;
    end if;
  end if;

  v_has_starts := (v_plan = 'premium' and not v_quota_reached)
                  or (v_plan <> 'premium' and (v_limit is null or v_used < v_limit));
  v_phase := case
    when v_plan = 'premium' then 'begleitung'
    when not v_has_starts then 'ruhemodus'
    when v_plan = 'tester' then 'begleitung'
    else 'kennenlernen'
  end;

  return jsonb_build_object(
    'phase',                v_phase,
    'starts_used',          v_used,
    'starts_limit',         case when v_plan = 'premium' then null else v_limit end,
    'can_start',            v_has_starts,
    'cap',                  case when v_plan in ('premium', 'tester') then null else c_cap end,
    'tier',                 case when v_has_quota then v_tier end,
    'period_end',           case when v_has_quota then coalesce(v_cancel_at, v_period_end) end,
    'cancel_at_period_end', case when v_has_quota then (coalesce(v_cancel_flag, false) or v_cancel_at is not null) else false end,
    'pending_tier',         case when v_has_quota then v_pending end,
    'quota_resets_at',      case when v_has_quota then v_q_end end,
    'messages_left',        case when v_has_quota then greatest(v_quota_limit - v_quota_used, 0) end,
    'quota_reached',        v_quota_reached
  );
end;
$$;
revoke all on function public.access_state_for(uuid) from public, anon, authenticated;
grant execute on function public.access_state_for(uuid) to service_role;
-- get_access_state() aus 038 bleibt unverändert (ruft access_state_for).

-- ── 4b. consume_session (Fassung 038 + reason / period_end bei Ablehnung) ───
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

  perform 1 from public.profiles where id = v_uid for update;
  v_state := public.access_state_for(v_uid);

  if not coalesce((v_state->>'can_start')::boolean, false) then
    return jsonb_build_object('allowed', false, 'counted', false,
                              'used', v_state->'starts_used', 'limit', v_state->'starts_limit',
                              'phase', v_state->>'phase',
                              'reason', case when coalesce((v_state->>'quota_reached')::boolean, false)
                                             then 'quota' else 'starts' end,
                              'period_end', v_state->'quota_resets_at');
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

-- ── 5a. consume_message: eine eigene Nachricht buchen (nur service_role) ────
-- Idempotent über (conversation_id, client_message_id). Zeitraumzeile wird gesperrt, damit
-- parallele Nachrichten nicht beide den letzten Platz bekommen.
create or replace function public.consume_message(
  p_user_id uuid, p_conversation_id uuid, p_client_message_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan text;
  s record;
  v_period record;
  v_limit integer;
  v_grace integer := public.quota_grace();
  q record;
  v_used integer;
  v_warn boolean := false;
begin
  select coalesce(plan, 'free') into v_plan from public.profiles where id = p_user_id;
  if not found or v_plan <> 'premium' then
    return jsonb_build_object('allowed', true, 'charged', false, 'reason', 'no_quota');
  end if;

  select tier, quota_anchor into s from public.subscriptions where user_id = p_user_id;
  if not found or s.quota_anchor is null or s.tier is null then
    return jsonb_build_object('allowed', true, 'charged', false, 'reason', 'no_quota');
  end if;

  select * into v_period from public.current_quota_period(s.quota_anchor, now());
  v_limit := public.quota_limit_for(s.tier);

  insert into public.message_quota_periods (user_id, period_start, period_end)
  values (p_user_id, v_period.period_start, v_period.period_end)
  on conflict (user_id, period_start) do nothing;

  select * into q from public.message_quota_periods
  where user_id = p_user_id and period_start = v_period.period_start
  for update;

  -- Schon gebucht (Wiederholung derselben Nachricht)
  if exists (select 1 from public.message_charges
             where conversation_id = p_conversation_id and client_message_id = p_client_message_id) then
    return jsonb_build_object('allowed', true, 'charged', false,
                              'remaining', greatest(v_limit - q.used, 0),
                              'period_end', v_period.period_end);
  end if;

  if q.used < v_limit then
    insert into public.message_charges (conversation_id, client_message_id, user_id, period_start, kind)
    values (p_conversation_id, p_client_message_id, p_user_id, v_period.period_start, 'quota');
    v_used := q.used + 1;
    v_warn := q.warned_at is null and v_used * 100 >= v_limit * public.quota_warn_percent();
    update public.message_quota_periods
       set used = v_used,
           warned_at = case when v_warn then now() else warned_at end
     where user_id = p_user_id and period_start = v_period.period_start;
    return jsonb_build_object('allowed', true, 'charged', true, 'kind', 'quota',
                              'remaining', v_limit - v_used, 'warn', v_warn, 'grace', false,
                              'period_end', v_period.period_end);
  end if;

  -- Kulanz: nur in einem Gespräch je Zeitraum
  if (q.grace_conversation_id is null or q.grace_conversation_id = p_conversation_id)
     and q.grace_used < v_grace then
    insert into public.message_charges (conversation_id, client_message_id, user_id, period_start, kind)
    values (p_conversation_id, p_client_message_id, p_user_id, v_period.period_start, 'grace');
    update public.message_quota_periods
       set grace_used = q.grace_used + 1,
           grace_conversation_id = p_conversation_id
     where user_id = p_user_id and period_start = v_period.period_start;
    return jsonb_build_object('allowed', true, 'charged', true, 'kind', 'grace',
                              'remaining', 0, 'warn', false, 'grace', true,
                              'grace_left', v_grace - (q.grace_used + 1),
                              'period_end', v_period.period_end);
  end if;

  return jsonb_build_object('allowed', false, 'charged', false, 'reason', 'quota_reached',
                            'period_end', v_period.period_end);
end;
$$;
revoke all on function public.consume_message(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.consume_message(uuid, uuid, uuid) to service_role;

-- ── 5b. refund_message: Buchung zurücknehmen (nur service_role) ─────────────
create or replace function public.refund_message(p_conversation_id uuid, p_client_message_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  c record;
begin
  delete from public.message_charges
   where conversation_id = p_conversation_id and client_message_id = p_client_message_id
  returning user_id, period_start, kind into c;
  if not found then
    return false;
  end if;

  if c.kind = 'quota' then
    update public.message_quota_periods set used = greatest(used - 1, 0)
     where user_id = c.user_id and period_start = c.period_start;
  else
    update public.message_quota_periods set grace_used = greatest(grace_used - 1, 0)
     where user_id = c.user_id and period_start = c.period_start;
  end if;
  return true;
end;
$$;
revoke all on function public.refund_message(uuid, uuid) from public, anon, authenticated;
grant execute on function public.refund_message(uuid, uuid) to service_role;

-- ── 6. apply_retention (Fassung 036 + Paket Z) ──────────────────────────────
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

  -- Paket Z: Buchungen und Kontingente nach 13 Monaten, Webhook-Ereignisse nach 90 Tagen
  delete from public.message_charges where charged_at < now() - interval '13 months';
  get diagnostics n = row_count; r := r || jsonb_build_object('message_charges_deleted', n);

  delete from public.message_quota_periods where period_end < now() - interval '13 months';
  get diagnostics n = row_count; r := r || jsonb_build_object('quota_periods_deleted', n);

  delete from public.stripe_events where received_at < now() - interval '90 days';
  get diagnostics n = row_count; r := r || jsonb_build_object('stripe_events_deleted', n);

  insert into public.app_logs (level, source, message, metadata)
  values ('info', 'retention', 'retention_applied', r);
  return r;
end;
$$;
revoke all on function public.apply_retention() from public, anon, authenticated;
