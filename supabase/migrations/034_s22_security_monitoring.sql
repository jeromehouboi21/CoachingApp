-- 034: S-22 Monitoring (Security-Paket C, Welle C-2)
-- Alarme (nur Zähler), Herkunft der Log-Einträge, Zählfunktion über app_logs, Cron-Jobs.

-- ── 1. Herkunft der Log-Einträge (Befund 1 aus Phase 0) ──────────────────────
-- Angemeldete Nutzer dürfen eigene app_logs-Zeilen schreiben (026) und könnten so beliebige
-- Codes fälschen. Der Trigger setzt die Herkunft nach der ausführenden Rolle; der Client kann
-- sie nicht beeinflussen. Das Monitoring zählt je Regel nur die passende Herkunft.
alter table public.app_logs
  add column if not exists origin text not null default 'client'
  check (origin in ('server', 'client'));

create or replace function public.set_app_log_origin()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Edge Functions schreiben als service_role, Cron-/SQL-Funktionen als postgres → 'server'
  new.origin := case when current_user in ('authenticated', 'anon') then 'client' else 'server' end;
  return new;
end;
$$;

drop trigger if exists trg_app_logs_origin on public.app_logs;
create trigger trg_app_logs_origin
  before insert on public.app_logs
  for each row execute function public.set_app_log_origin();

-- Bestand (≤ 30 Tage): Einträge der Server-Quellen nachträglich kennzeichnen
update public.app_logs set origin = 'server'
 where origin = 'client'
   and source in ('chat', 'post-conversation', 'pre-session-briefing', 'validate-invite-code',
                  'admin-users', 'admin-feedback', 'admin-invite-user', 'delete-account',
                  'supervision', 'backfill-embeddings', 'retention', 'rag-search');

create index if not exists app_logs_message_created_idx on public.app_logs (message, created_at desc);

-- ── 2. Alarme ────────────────────────────────────────────────────────────────
create table if not exists public.security_alerts (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null default 'alert' check (kind in ('alert', 'weekly_digest', 'probe')),
  rule         text not null,
  window_start timestamptz not null,
  window_end   timestamptz not null,
  count        integer not null default 0,
  details      jsonb not null default '{}'::jsonb,   -- nur Zähler und Codes
  mailed_at    timestamptz,
  mail_error   text,                                 -- nur Fehlercode
  created_at   timestamptz not null default now()
);
alter table public.security_alerts enable row level security;
revoke all on public.security_alerts from anon, authenticated;
grant select, insert, update on public.security_alerts to service_role;
create index if not exists security_alerts_rule_created_idx on public.security_alerts (rule, created_at desc);

-- ── 3. Zählfunktion (keine Inhalte, nur Code + Herkunft + Anzahl) ────────────
create or replace function public.security_log_counts(p_since timestamptz, p_codes text[])
returns table (code text, origin text, n bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select l.message, l.origin, count(*)
  from public.app_logs l
  where l.created_at >= p_since and l.message = any (p_codes)
  group by l.message, l.origin;
$$;
revoke all on function public.security_log_counts(timestamptz, text[]) from public, anon, authenticated;
grant execute on function public.security_log_counts(timestamptz, text[]) to service_role;

-- ── 4. Cron-Jobs ─────────────────────────────────────────────────────────────
-- Stündlicher Lauf; Aufbau wie weekly-supervision (023), Secret aus Vault.
select cron.unschedule('security-monitor')
where exists (select 1 from cron.job where jobname = 'security-monitor');
select cron.schedule('security-monitor', '7 * * * *', $$
  select net.http_post(
    url := 'https://dpvqysabgycdjawkdrah.supabase.co/functions/v1/security-monitor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
$$);

-- Alarme 12 Monate aufbewahren
select cron.unschedule('purge-security-alerts')
where exists (select 1 from cron.job where jobname = 'purge-security-alerts');
select cron.schedule('purge-security-alerts', '29 3 * * *',
  $$ delete from public.security_alerts where created_at < now() - interval '12 months' $$);
