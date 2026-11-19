-- Friedensstifter U4-Audit (nur Zähler, keine Inhalte, keine E-Mail-Adressen)
-- Grundlage für die Entscheidungen E-U4-1 bis E-U4-4 im Handoff U4.

-- A) Konten je Plan und Gesprächsgrenze (session_limit)
select coalesce(plan, '(leer)') as plan,
       coalesce(session_limit::text, 'unbegrenzt') as session_limit,
       count(*) as konten
from public.profiles
group by 1, 2
order by 1, 2;

-- B) Wie lang werden Gespräche? (Nachrichten je Gespräch, nur Gespräche mit eigener Nachricht)
with per_conv as (
  select m.conversation_id, count(*) as n,
         count(*) filter (where m.role = 'user') as n_user
  from public.messages m
  group by 1
)
select count(*)                                              as gespraeche,
       percentile_disc(0.5)  within group (order by n)       as median_nachrichten,
       percentile_disc(0.9)  within group (order by n)       as p90_nachrichten,
       max(n)                                                as max_nachrichten,
       count(*) filter (where n >= 100)                      as ueber_100
from per_conv
where n_user > 0;

-- C) Konten, die Gespräche über 100 Nachrichten haben (Anzahl Konten, keine IDs)
select count(distinct c.user_id) as konten_mit_gespraech_ueber_100
from public.conversations c
join (select conversation_id from public.messages group by 1 having count(*) >= 100) big
  on big.conversation_id = c.id;
