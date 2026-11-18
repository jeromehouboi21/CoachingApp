-- Friedensstifter Security-Audit (nur Metadaten, keine Inhalte)
-- Jede Abfrage einzeln im Supabase-SQL-Editor ausführen und das Ergebnis kopieren.
-- A–H: aus dem Handoff Security-Paket A. I–N: Ergänzungen aus der Code-Bestandsaufnahme
-- (siehe docs/security/paket-a-discovery.md). Keine Abfrage liest Gesprächs- oder Profilinhalte.

-- A) Tabellen im public-Schema mit RLS-Status
select c.relname as table_name, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by 1;

-- B) Alle Policies
select tablename, policyname, permissive, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public'
order by tablename, cmd, policyname;

-- C) Tabellenrechte für anon und authenticated (inkl. Views)
select grantee, table_name, string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated')
group by grantee, table_name
order by table_name, grantee;

-- D) Funktionen im public-Schema: SECURITY DEFINER, search_path, Ausführungsrechte
select p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as args,
       p.prosecdef as security_definer,
       p.proconfig as config,
       has_function_privilege('anon', p.oid, 'execute') as anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'execute') as auth_can_execute
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by 1;

-- E) Trigger auf profiles, conversations, messages und auth.users
select event_object_schema, event_object_table, trigger_name, action_timing, event_manipulation, action_statement
from information_schema.triggers
where (event_object_schema = 'public' and event_object_table in ('profiles', 'conversations', 'messages'))
   or (event_object_schema = 'auth' and event_object_table = 'users')
order by 1, 2, 3;

-- F) Realtime-Publikation
select schemaname, tablename from pg_publication_tables where pubname = 'supabase_realtime';

-- G) Cron-Jobs (nur Name, Zeitplan, Befehl gekürzt)
--    Falls "schema cron does not exist": pg_cron ist nicht aktiv → bitte genau das zurückmelden.
--    ⚠️ Falls im Befehl ein Key/Token im Klartext steht: in der Ausgabe durch *** ersetzen.
select jobid, jobname, schedule, active, left(command, 160) as command_preview from cron.job order by jobid;

-- H) Spalten von app_logs
select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'app_logs' order by ordinal_position;

-- ── Ergänzungen ──────────────────────────────────────────────────────────────

-- I) Views im public-Schema: security_invoker gesetzt? Wer darf lesen?
--    (Hintergrund: feedback_survey_scores aus Migration 022 hat kein security_invoker
--     und umgeht damit RLS, falls anon/authenticated SELECT haben.)
select c.relname as view_name,
       c.reloptions as options,
       has_table_privilege('anon', c.oid, 'select') as anon_can_select,
       has_table_privilege('authenticated', c.oid, 'select') as auth_can_select
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('v', 'm')
order by 1;

-- J) Installierte Extensions (pg_cron, pg_net, vector …)
select extname, extversion from pg_extension order by 1;

-- K) Spalten + Defaults von profiles und conversations (für Schutz-Trigger und session_limit-Default)
select table_name, column_name, data_type, column_default, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name in ('profiles', 'conversations')
order by table_name, ordinal_position;

-- L) Default-Privilegien im public-Schema (bekommen neue Tabellen automatisch anon-Rechte?)
select pg_get_userbyid(d.defaclrole) as owner, d.defaclobjtype as object_type, d.defaclacl as acl
from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace
where n.nspname = 'public';

-- M) app_logs: nur ZÄHLER, welche Metadaten-Schlüssel mit (potenziellen) Inhalten vorkommen.
--    Liefert keine Inhalte, nur Anzahlen. Grundlage für die Altbestand-Bereinigung.
select
  count(*)                                                        as total_rows,
  count(*) filter (where created_at < now() - interval '30 days') as older_than_30_days,
  count(*) filter (where user_id is null)                         as without_user,
  count(*) filter (where metadata ? 'rawResponsePreview')         as has_raw_response_preview,
  count(*) filter (where metadata ? 'raw')                        as has_raw,
  count(*) filter (where metadata ? 'label')                      as has_label,
  count(*) filter (where metadata ? 'pattern')                    as has_pattern,
  count(*) filter (where metadata ? 'email' or metadata ? 'invitedEmail') as has_email,
  count(*) filter (where metadata ? 'code')                       as has_invite_code,
  count(*) filter (where metadata ? 'topic')                      as has_topic,
  count(*) filter (where metadata ? 'body' or metadata ? 'details') as has_body_or_details,
  count(*) filter (where error_detail is not null)                as has_error_detail
from public.app_logs;

-- N) Wie viele Profile haben privilegierte Werte? (nur Zähler)
select plan, is_admin, is_beta_tester, (session_limit is null) as unlimited, count(*)
from public.profiles
group by 1, 2, 3, 4
order by 1, 2, 3, 4;
