-- Friedensstifter Security-Audit – Sammelabfrage (nur Metadaten, keine Inhalte)
-- Gleicher Inhalt wie audit.sql (A–F, H–N), aber als EIN Ergebnis: eine Zeile pro Abschnitt.
-- Ausführen, dann Ergebnis exportieren (Button "Export" → CSV) oder alle Zeilen kopieren.
-- Cron (G) steht separat am Ende, weil die Abfrage fehlschlägt, wenn pg_cron nicht aktiv ist.

select 'A_tables_rls' as section, coalesce(jsonb_agg(x order by x->>'table_name'), '[]') as result
from (
  select jsonb_build_object('table_name', c.relname, 'rls_enabled', c.relrowsecurity, 'rls_forced', c.relforcerowsecurity) as x
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
) s

union all
select 'B_policies', coalesce(jsonb_agg(x), '[]')
from (
  select jsonb_build_object('table', tablename, 'policy', policyname, 'permissive', permissive, 'cmd', cmd,
                            'roles', roles, 'using', qual, 'with_check', with_check) as x
  from pg_policies where schemaname = 'public'
  order by tablename, cmd, policyname
) s

union all
select 'C_grants_anon_authenticated', coalesce(jsonb_agg(x), '[]')
from (
  select jsonb_build_object('grantee', grantee, 'table', table_name,
                            'privileges', string_agg(privilege_type, ', ' order by privilege_type)) as x
  from information_schema.role_table_grants
  where table_schema = 'public' and grantee in ('anon', 'authenticated')
  group by grantee, table_name
  order by table_name, grantee
) s

union all
select 'D_functions', coalesce(jsonb_agg(x), '[]')
from (
  select jsonb_build_object('function', p.proname, 'args', pg_get_function_identity_arguments(p.oid),
                            'security_definer', p.prosecdef, 'config', p.proconfig,
                            'anon_exec', has_function_privilege('anon', p.oid, 'execute'),
                            'auth_exec', has_function_privilege('authenticated', p.oid, 'execute')) as x
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
  order by p.proname
) s

union all
select 'E_triggers', coalesce(jsonb_agg(x), '[]')
from (
  select jsonb_build_object('schema', event_object_schema, 'table', event_object_table, 'trigger', trigger_name,
                            'timing', action_timing, 'event', event_manipulation, 'statement', action_statement) as x
  from information_schema.triggers
  where (event_object_schema = 'public' and event_object_table in ('profiles', 'conversations', 'messages'))
     or (event_object_schema = 'auth' and event_object_table = 'users')
  order by 1
) s

union all
select 'F_realtime', coalesce(jsonb_agg(x), '[]')
from (
  select jsonb_build_object('schema', schemaname, 'table', tablename) as x
  from pg_publication_tables where pubname = 'supabase_realtime'
) s

union all
select 'H_app_logs_columns', coalesce(jsonb_agg(x), '[]')
from (
  select jsonb_build_object('column', column_name, 'type', data_type) as x
  from information_schema.columns
  where table_schema = 'public' and table_name = 'app_logs'
  order by ordinal_position
) s

union all
select 'I_views', coalesce(jsonb_agg(x), '[]')
from (
  select jsonb_build_object('view', c.relname, 'options', c.reloptions,
                            'anon_select', has_table_privilege('anon', c.oid, 'select'),
                            'auth_select', has_table_privilege('authenticated', c.oid, 'select')) as x
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('v', 'm')
) s

union all
select 'J_extensions', coalesce(jsonb_agg(x), '[]')
from (select jsonb_build_object('ext', extname, 'version', extversion) as x from pg_extension) s

union all
select 'K_columns_profiles_conversations', coalesce(jsonb_agg(x), '[]')
from (
  select jsonb_build_object('table', table_name, 'column', column_name, 'type', data_type,
                            'default', column_default, 'nullable', is_nullable) as x
  from information_schema.columns
  where table_schema = 'public' and table_name in ('profiles', 'conversations')
  order by table_name, ordinal_position
) s

union all
select 'L_default_privileges', coalesce(jsonb_agg(x), '[]')
from (
  select jsonb_build_object('owner', pg_get_userbyid(d.defaclrole), 'type', d.defaclobjtype, 'acl', d.defaclacl::text[]) as x
  from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace
  where n.nspname = 'public'
) s

union all
select 'M_app_logs_counts', jsonb_build_object(
  'total_rows', count(*),
  'older_than_30_days', count(*) filter (where created_at < now() - interval '30 days'),
  'without_user', count(*) filter (where user_id is null),
  'has_raw_response_preview', count(*) filter (where metadata ? 'rawResponsePreview'),
  'has_raw', count(*) filter (where metadata ? 'raw'),
  'has_label', count(*) filter (where metadata ? 'label'),
  'has_pattern', count(*) filter (where metadata ? 'pattern'),
  'has_email', count(*) filter (where metadata ? 'email' or metadata ? 'invitedEmail'),
  'has_invite_code', count(*) filter (where metadata ? 'code'),
  'has_topic', count(*) filter (where metadata ? 'topic'),
  'has_body_or_details', count(*) filter (where metadata ? 'body' or metadata ? 'details'),
  'has_error_detail', count(*) filter (where error_detail is not null))
from public.app_logs;

-- ── G) Cron-Jobs: SEPARAT ausführen (nur diese Zeile markieren und "Run selected") ──
-- Falls "schema cron does not exist": pg_cron ist nicht aktiv → genau das zurückmelden.
-- ⚠️ Falls im Befehl ein Key/Token im Klartext steht: in der Ausgabe durch *** ersetzen.
-- select jobid, jobname, schedule, active, left(command, 160) as command_preview from cron.job order by jobid;
