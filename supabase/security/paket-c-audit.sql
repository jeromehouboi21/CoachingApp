-- Friedensstifter Security-Audit Paket C (nur Metadaten und Zähler, keine Inhalte)
-- Ausführen im Supabase SQL-Editor. Jede Abfrage einzeln markieren und ausführen,
-- Ergebnis als docs/security/paket-c-audit-result.md ablegen (wird nicht committet).

-- A) Policies für authenticated (Grundlage für die MFA-Policies in C-5)
select tablename, policyname, cmd, permissive, roles
from pg_policies where schemaname = 'public' and 'authenticated' = any(roles)
order by 1, 3;

-- B) Spalten von app_logs, user_feedback, feedback_surveys
select table_name, column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public' and table_name in ('app_logs', 'user_feedback', 'feedback_surveys')
order by 1, ordinal_position;

-- C) Feedback ohne echte Einwilligung (nur Zähler)
select 'user_feedback' as tabelle,
       count(*) filter (where consent_given) as with_consent, count(*) as total
from public.user_feedback
union all
select 'feedback_surveys', null, count(*) from public.feedback_surveys;

-- D) Häufigkeit der Log-Codes der letzten 7 Tage (für die Schwellen in S-22)
select message, level, source, count(*) from public.app_logs
where created_at > now() - interval '7 days'
group by 1, 2, 3 order by 4 desc limit 60;

-- E) Funktionen, die authenticated ausführen darf
select p.proname, p.prosecdef as security_definer
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and has_function_privilege('authenticated', p.oid, 'execute')
order by 1;

-- F) Alle Tabellen mit Personenbezug-Spalten (Grundlage für den Export S-16)
select c.table_name, string_agg(c.column_name, ', ' order by c.column_name) as bezugsspalten
from information_schema.columns c
join information_schema.tables t
  on t.table_schema = c.table_schema and t.table_name = c.table_name and t.table_type = 'BASE TABLE'
where c.table_schema = 'public'
  and c.column_name in ('user_id', 'source_user_id', 'conversation_id', 'invited_by', 'last_enriched_by',
                        'source_conversation_id', 'message_id')
group by 1 order by 1;

-- G) Tabellen mit Client-Rechten (Grundlage für die MFA-Policies in C-5)
select table_name, string_agg(privilege_type, ', ' order by privilege_type) as rechte
from information_schema.role_table_grants
where table_schema = 'public' and grantee = 'authenticated'
group by 1 order by 1;

-- H) Bestehende Cron-Jobs (nur Name, Zeitplan, aktiv)
select jobname, schedule, active from cron.job order by 1;
