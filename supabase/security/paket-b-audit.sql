-- Friedensstifter Security-Audit Paket B (nur Metadaten, keine Inhalte)
-- Im SQL-Editor ausführen. Jede Abfrage einzeln markieren und ausführen (oder alles,
-- dann zeigt der Editor nur das letzte Ergebnis) und die Tabellen an Claude Code geben.

-- A) Alle Fremdschlüssel im public-Schema und ihr Löschverhalten
select c.conrelid::regclass  as table_name,
       a.attname             as column_name,
       c.confrelid::regclass as references_table,
       case c.confdeltype when 'c' then 'CASCADE' when 'n' then 'SET NULL'
                          when 'r' then 'RESTRICT' when 'a' then 'NO ACTION'
                          when 'd' then 'SET DEFAULT' end as on_delete,
       c.conname             as constraint_name
from pg_constraint c
join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
where c.contype = 'f' and c.connamespace = 'public'::regnamespace
order by 3, 1;

-- B) Spalten, die auf Nutzer oder Gespräche zeigen (auch ohne Fremdschlüssel)
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and column_name in ('user_id', 'source_user_id', 'invited_by', 'conversation_id', 'message_id',
                      'source_conversation_id', 'last_enriched_by')
order by 1, 2;

-- C1) Policies auf messages und experience_patterns
select tablename, policyname, cmd, roles from pg_policies
where schemaname = 'public' and tablename in ('messages', 'experience_patterns') order by 1, 3;

-- C2) Tabellenrechte auf messages und experience_patterns
select grantee, table_name, string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public' and table_name in ('messages', 'experience_patterns')
  and grantee in ('anon', 'authenticated')
group by 1, 2 order by 2, 1;

-- D) Größe der Lernbasis und verwaiste Datensätze (nur Anzahlen)
select
  (select count(*) from public.experience_patterns)                              as experience_patterns_rows,
  (select count(*) from public.coach_reflections where conversation_id is null)  as reflections_ohne_gespraech,
  (select count(*) from public.user_feedback where user_id is null)              as feedback_ohne_nutzer,
  (select count(*) from public.messages where conversation_id is null)           as messages_ohne_gespraech,
  (select count(*) from public.conversations c
     where not exists (select 1 from public.profiles p where p.id = c.user_id))  as gespraeche_ohne_profil;

-- E) MFA-Faktoren (nur Anzahl je Typ und Status, keine IDs)
select factor_type, status, count(*) from auth.mfa_factors group by 1, 2;

-- F) Cron-Jobs
select jobid, jobname, schedule from cron.job order by jobid;

-- G) Existiert die Alt-Tabelle error_logs noch? (Migration 004, ersetzt durch app_logs)
select table_name from information_schema.tables
where table_schema = 'public' and table_name in ('error_logs', 'app_logs');
