-- Friedensstifter Paket Z – Monatskontingent für den Test J-Z2 setzen (nur Testkonten!)
-- Platzhalter <TEST_EMAIL> durch die Adresse des Testkontos mit Sandbox-Abo ersetzen.
-- Diese Datei NICHT mit echten Adressen einchecken. Liefert nur Zähler, keine Inhalte.
--
-- Voraussetzung: Das Testkonto hat in der Stripe-Sandbox ein Abo abgeschlossen (Schritt 1),
-- d. h. es gibt eine Zeile in public.subscriptions und plan = 'premium'.
-- Ablauf: einen der Blöcke 1a/1b/1c ausführen, dann in der App eine Nachricht schreiben.

-- 0) Kontrolle vorher (nur Zähler und Status)
select p.plan, s.tier, s.billing_interval, s.status, s.quota_anchor, s.current_period_end,
       s.cancel_at_period_end, s.cancel_at, s.pending_tier
from public.profiles p
join auth.users u on u.id = p.id
left join public.subscriptions s on s.user_id = p.id
where u.email = '<TEST_EMAIL>';

-- 1) Zeitraum anlegen bzw. setzen. Wert für used je nach Test:
--    Test 3 (Hinweis ab 80 %):        119  → nächste Nachricht zeigt „Noch 30 Nachrichten …“
--    Test 4 (Grenze + Kulanz):        150  → laufendes Gespräch: 10 weitere, dann Hinweis mit Datum
--    Test 5 (neues Gespräch gesperrt): 150 → neues Gespräch: Ruhemodus-Hinweis mit Datum
with u as (
  select id from auth.users where email = '<TEST_EMAIL>'
), s as (
  select sub.user_id, sub.quota_anchor from public.subscriptions sub join u on u.id = sub.user_id
), q as (
  select s.user_id, cq.period_start, cq.period_end
  from s, public.current_quota_period(s.quota_anchor, now()) cq
)
insert into public.message_quota_periods (user_id, period_start, period_end, used, grace_used, grace_conversation_id, warned_at)
select user_id, period_start, period_end, 119, 0, null, null from q          -- ← 119 bzw. 150
on conflict (user_id, period_start) do update
  set used = excluded.used, grace_used = 0, grace_conversation_id = null, warned_at = null;

-- 2) Kontrolle nachher (nur Zähler)
select m.period_start, m.period_end, m.used, m.grace_used, m.warned_at is not null as warned
from public.message_quota_periods m
join auth.users u on u.id = m.user_id
where u.email = '<TEST_EMAIL>'
order by m.period_start desc
limit 3;

-- 3) Zurücksetzen nach dem Test (Zeitraum löschen → Kontingent wieder voll)
-- delete from public.message_quota_periods
-- where user_id = (select id from auth.users where email = '<TEST_EMAIL>');

-- 4) Für Tests mit Stripe-Testuhr (J-Z2 Tests 8 und 12): Einen in der Testuhr angelegten Kunden
--    (cus_…) dem Testkonto zuordnen, BEVOR auf /begleitung bezahlt wird. Die Bezahlseite verwendet
--    dann diesen Kunden, und die Testuhr steuert Verlängerung und Periodenende.
--    Nur für ein Testkonto ohne laufendes Abo.
-- insert into public.subscriptions (user_id, stripe_customer_id)
-- select id, '<CUS_ID_AUS_DER_TESTUHR>' from auth.users where email = '<TEST_EMAIL>'
-- on conflict (user_id) do update set stripe_customer_id = excluded.stripe_customer_id,
--   stripe_subscription_id = null, status = null, tier = null, quota_anchor = null;
