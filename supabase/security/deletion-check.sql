-- Friedensstifter Löschtest (S-15): Reste eines gelöschten Testnutzers zählen — nur Zähler.
-- Die drei Platzhalter durch die Ausgabe von `npm run security:deletion-test` ersetzen.
-- Erwartung: Jede Zeile hat remaining = 0.
-- Neue Tabellen mit user_id/conversation_id (z. B. Paket Z: subscriptions, message_quota_periods,
-- message_charges) werden über information_schema automatisch mitgezählt.
with p as (
  select '<USER_ID>'::uuid as uid,
         array['<CONV_ID_1>', '<CONV_ID_2>']::uuid[] as convs
),
cols as (
  select c.table_name, c.column_name
  from information_schema.columns c
  join information_schema.tables t
    on t.table_schema = c.table_schema and t.table_name = c.table_name and t.table_type = 'BASE TABLE'
  where c.table_schema = 'public'
    and c.column_name in ('user_id', 'source_user_id', 'invited_by', 'conversation_id')
)
select cols.table_name::text, cols.column_name::text,
       (xpath('/row/n/text()', query_to_xml(
          case when cols.column_name = 'conversation_id'
               then format('select count(*) as n from public.%I where %I = any(%L::uuid[])',
                           cols.table_name, cols.column_name, p.convs)
               else format('select count(*) as n from public.%I where %I = %L::uuid',
                           cols.table_name, cols.column_name, p.uid)
          end, false, true, '')))[1]::text::int as remaining
from cols, p
union all select 'profiles', 'id', count(*)::int from public.profiles, p where id = p.uid
union all select 'conversations', 'id', count(*)::int from public.conversations, p where id = any(p.convs)
union all select 'auth.users', 'id', count(*)::int from auth.users, p where id = p.uid
union all select 'auth.identities', 'user_id', count(*)::int from auth.identities, p where user_id = p.uid
union all select 'auth.sessions', 'user_id', count(*)::int from auth.sessions, p where user_id = p.uid
union all select 'auth.mfa_factors', 'user_id', count(*)::int from auth.mfa_factors, p where user_id = p.uid
order by 3 desc, 1;
