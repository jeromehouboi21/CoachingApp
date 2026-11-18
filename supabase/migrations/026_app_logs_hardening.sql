-- 026: app_logs absichern, Altbestand bereinigen, 30 Tage Aufbewahrung (Security-Paket A, S-04)
--
-- - Client (authenticated) darf nur eigene Zeilen einfügen, nichts lesen/ändern/löschen.
-- - anon darf gar nichts mehr (vorher: Insert mit user_id IS NULL erlaubt).
-- - Edge Functions schreiben weiter über service_role.
-- - Größenlimit für metadata (JSON-Spalte heißt metadata, nicht data – Audit H).
-- - Einmalige Bereinigung: alles älter als 30 Tage löschen; in jüngeren Zeilen
--   Schlüssel mit (potenziellen) Inhalten entfernen (Zähler: Audit M).
-- - Täglicher Löschjob purge-app-logs.

-- ── 1. Policies (echte Namen aus dem Audit) ─────────────────────────────────
drop policy if exists "Users can insert own logs"          on public.app_logs;
drop policy if exists "Service role full access"           on public.app_logs;
drop policy if exists "Service role can insert app_logs"   on public.app_logs;

revoke all on public.app_logs from anon;
revoke all on public.app_logs from authenticated;
grant insert on public.app_logs to authenticated;

create policy app_logs_insert_own on public.app_logs
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- ── 2. Größe begrenzen ──────────────────────────────────────────────────────
alter table public.app_logs drop constraint if exists app_logs_metadata_size;
alter table public.app_logs
  add constraint app_logs_metadata_size check (metadata is null or pg_column_size(metadata) <= 8192) not valid;

-- ── 3. Einmalige Bereinigung des Altbestands ────────────────────────────────
delete from public.app_logs where created_at < now() - interval '30 days';

-- Bis zum Deploy von Welle 1 (18.11.2026) konnten diese Schlüssel Inhalte enthalten:
-- Modellausgaben (rawResponsePreview, raw, pattern), Akte-Labels (label), E-Mail-Adressen
-- (email, invitedEmail), Einladungscodes (code), Muster-Labels (topic), Antwortkörper
-- (body, error), Postgres-Fehlerdetails (details, hint).
update public.app_logs
set metadata = metadata - array['rawResponsePreview', 'raw', 'pattern', 'label', 'email', 'invitedEmail',
                                'code', 'topic', 'body', 'error', 'details', 'hint']
where created_at < timestamptz '2026-11-18 18:00:00+00'
  and metadata ?| array['rawResponsePreview', 'raw', 'pattern', 'label', 'email', 'invitedEmail',
                        'code', 'topic', 'body', 'error', 'details', 'hint'];

-- Fehlertexte/Stacktraces aus der Zeit vor Welle 1 (JSON.parse-Meldungen enthielten Textausschnitte)
update public.app_logs
set error_detail = null, stack_trace = null
where created_at < timestamptz '2026-11-18 18:00:00+00'
  and (error_detail is not null or stack_trace is not null);

-- ── 4. Täglicher Löschjob (03:17 UTC) ───────────────────────────────────────
select cron.unschedule('purge-app-logs')
where exists (select 1 from cron.job where jobname = 'purge-app-logs');
select cron.schedule('purge-app-logs', '17 3 * * *',
  $$ delete from public.app_logs where created_at < now() - interval '30 days' $$);
