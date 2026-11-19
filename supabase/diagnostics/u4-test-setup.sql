-- Friedensstifter U4 – Testkonten für den Angriffstest vorbereiten (einmalig, nur Testkonten!)
-- Platzhalter <TEST_A_EMAIL> / <TEST_B_EMAIL> durch die Adressen aus .env.security.local ersetzen.
-- Diese Datei NICHT mit echten Adressen einchecken.

-- 1) Testkonto B in den Ruhemodus: Tester ohne freie Starts → neues Gespräch = 429 session_limit.
--    (Tester haben keine Kappung, daher bleiben die dauerhaften S-12-Testgespräche von B nutzbar.)
update public.profiles
set plan = 'tester', session_limit = 0
where id = (select id from auth.users where email = '<TEST_B_EMAIL>');

-- 2) Testkonto A: ein synthetisches Gespräch mit 100 Platzhalter-Nachrichten → 101. Nachricht = 409.
--    Voraussetzung: A hat plan 'free' (Kappung gilt nicht für tester/premium).
with a as (
  select id from auth.users where email = '<TEST_A_EMAIL>'
), c as (
  insert into public.conversations (user_id, title, session_counted_at)
  select id, 'SECTEST Kappung', now() from a
  returning id
)
insert into public.messages (conversation_id, role, content, message_type, created_at)
select c.id,
       case when g % 2 = 1 then 'user' else 'assistant' end,
       'Platzhalter ' || g,
       'standard',
       now() - interval '1 day' + (g || ' seconds')::interval
from c, generate_series(1, 100) as g;

-- 3) Kontrolle (nur Zähler)
select p.plan, p.session_limit, p.trial_sessions_used
from public.profiles p join auth.users u on u.id = p.id
where u.email in ('<TEST_A_EMAIL>', '<TEST_B_EMAIL>');
select count(*) as nachrichten_im_kappungstest
from public.messages m join public.conversations c on c.id = m.conversation_id
where c.title = 'SECTEST Kappung';
