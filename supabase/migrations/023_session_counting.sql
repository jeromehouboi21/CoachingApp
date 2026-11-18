-- 023: Sitzungszählung serverseitig und idempotent pro Konversation (Security-Paket A, S-01a)
--
-- Inhalt:
--   1. conversations.session_counted_at + Backfill (bestehende Gespräche gelten als gezählt)
--   2. RPC consume_session(p_conversation_id) — von der chat-Function mit dem Nutzer-Token aufgerufen
--   3. Schutz-Trigger: server-eigene Spalten von conversations sind für Clients nicht schreibbar
--      (sonst könnte ein Client beim Insert session_counted_at mitschicken und nie gezählt werden)
--   4. Cron: Monats-Reset der Zähler (gab es bisher nicht) + Supervision mit x-cron-secret aus Vault
--
-- Zählregel (Entscheidung 18.11.2026): Eine Konversation zählt beim ersten chat-Aufruf im
-- Gesprächsmodus. Fortsetzen zählt nicht (session_counted_at bereits gesetzt), Howto-FAQ und
-- Gedächtnis-Extraktion rufen consume_session nicht auf.

-- ── 1. Spalte + Backfill ────────────────────────────────────────────────────
alter table public.conversations
  add column if not exists session_counted_at timestamptz;

-- Bestehende Gespräche gelten als bereits gezählt (Fortsetzen darf nicht nachzählen)
update public.conversations set session_counted_at = now()
where session_counted_at is null;

-- ── 2. consume_session ──────────────────────────────────────────────────────
create or replace function public.consume_session(p_conversation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_counted timestamptz;
  v_plan text;
  v_limit integer;
  v_used integer;
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

  select plan, session_limit, sessions_used_this_month
    into v_plan, v_limit, v_used
  from public.profiles where id = v_uid for update;

  if coalesce(v_plan, 'free') <> 'premium'
     and v_limit is not null
     and coalesce(v_used, 0) >= v_limit then
    return jsonb_build_object('allowed', false, 'counted', false,
                              'used', v_used, 'limit', v_limit);
  end if;

  update public.conversations set session_counted_at = now() where id = p_conversation_id;
  update public.profiles set sessions_used_this_month = coalesce(sessions_used_this_month, 0) + 1
  where id = v_uid;

  return jsonb_build_object('allowed', true, 'counted', true,
                            'used', coalesce(v_used, 0) + 1, 'limit', v_limit);
end;
$$;

revoke all on function public.consume_session(uuid) from public, anon;
grant execute on function public.consume_session(uuid) to authenticated, service_role;

-- ── 3. Schutz server-eigener Spalten auf conversations ──────────────────────
-- Gilt nur für Client-Rollen. service_role, postgres und SECURITY-DEFINER-Funktionen
-- (consume_session läuft als Owner) sind nicht betroffen.
create or replace function public.protect_conversation_server_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.session_counted_at           := null;
    new.post_processed_at            := null;
    new.post_processed_message_count := 0;
    return new;
  end if;

  if new.session_counted_at           is distinct from old.session_counted_at
  or new.post_processed_at            is distinct from old.post_processed_at
  or new.post_processed_message_count is distinct from old.post_processed_message_count then
    raise exception 'conversation_server_columns_are_server_only'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_conversation_server_columns() from public, anon, authenticated;

drop trigger if exists trg_protect_conversation_server_columns on public.conversations;
create trigger trg_protect_conversation_server_columns
  before insert or update on public.conversations
  for each row execute function public.protect_conversation_server_columns();

-- ── 4. Cron-Jobs ────────────────────────────────────────────────────────────
-- pg_net wird für HTTP-Aufrufe aus Cron benötigt (war bisher nicht installiert,
-- dadurch lief weekly-supervision faktisch nie).
create extension if not exists pg_net with schema extensions;

-- 4a. Monats-Reset der Gesprächszähler (1. des Monats, 00:00 UTC). Läuft als postgres
--     und ist damit vom Profil-Schutz-Trigger (Migration 024) nicht betroffen.
select cron.unschedule('reset-monthly-sessions')
where exists (select 1 from cron.job where jobname = 'reset-monthly-sessions');
select cron.schedule('reset-monthly-sessions', '0 0 1 * *',
  $$ update public.profiles set sessions_used_this_month = 0 where sessions_used_this_month <> 0 $$);

-- 4b. Supervision: statt Publishable-Key als Bearer jetzt Header x-cron-secret.
--     Das Secret liegt in Supabase Vault (Name 'cron_secret'), NICHT im Klartext im Job.
--     Voraussetzung (Jerome, J-3): derselbe Wert als Function-Secret CRON_SECRET und
--     einmalig per  select vault.create_secret('<wert>', 'cron_secret');  in Vault.
select cron.unschedule('weekly-supervision')
where exists (select 1 from cron.job where jobname = 'weekly-supervision');
select cron.schedule('weekly-supervision', '0 6 * * 1', $$
  select net.http_post(
    url := 'https://dpvqysabgycdjawkdrah.supabase.co/functions/v1/supervision',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
$$);
