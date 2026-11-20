-- k-legal-ablaeufe.sql – SQL-Vorlagen für die Abläufe aus den Rechtstexten v2.0 (Paket K, CODE-9)
-- Ablauf und Fristen: docs/konto/ablaeufe-rechte.md
-- Im Supabase-SQL-Editor einzeln ausführen. Ergebnisse nicht weitergeben.
-- Ausgaben: Zähler, IDs, Zeitpunkte. Inhalte nur in Abfrage 3b (Krisen-Sichtung, bewusst einzeln).

-- ── 1. Erneute Zustimmung: Konten ohne Zustimmung v2.0 ─────────────────────
-- 1a. Zähler
select count(*) as ohne_zustimmung_v2
  from public.profiles
 where coalesce(consent_version, '') <> '2.0' or coalesce(coaching_agreement_version, '') <> '2.0';

-- 1b. Liste für die Erinnerung (ID, seit wann registriert, letzte Anmeldung).
--     Die E-Mail-Adresse findest du über Authentication → Users (Suche nach der ID).
select p.id, u.created_at, u.last_sign_in_at,
       p.consent_version, p.coaching_agreement_version
  from public.profiles p
  join auth.users u on u.id = p.id
 where coalesce(p.consent_version, '') <> '2.0' or coalesce(p.coaching_agreement_version, '') <> '2.0'
 order by u.last_sign_in_at nulls first;

-- ── 2. Inaktive Konten (Kündigung kostenloser Konten, Datensparsamkeit) ────
select * from public.inactive_accounts_report(24);   -- Monate ohne Anmeldung

-- ── 3. Krisen-Sichtung ──────────────────────────────────────────────────────
-- 3a. Ungesichtete Ereignisse, ohne Text
select id, detected_at, confidence, (excerpt is not null) as ausschnitt_vorhanden
  from public.crisis_events
 where reviewed_by_jerome = false
 order by detected_at;

-- 3b. Sichtung EINES Ereignisses (zeigt den Ausschnitt; nur für den Zweck aus der Vereinbarung)
-- select id, detected_at, confidence, excerpt from public.crisis_events where id = '<ID>';

-- 3c. Als gesichtet markieren → apply_retention leert den Ausschnitt in der nächsten Nacht
-- update public.crisis_events
--    set reviewed_by_jerome = true, reviewed_at = now()
--  where id = '<ID>';

-- ── 4. Vor Migration 041 (E1/E2): wie viel betroffen ist ───────────────────
select (select count(*) from public.coach_reflections)                   as reflexionen,
       (select count(*) from public.profiles where learning_opt_in)      as lernbasis_zustimmungen,
       (select count(*) from public.experience_patterns)                 as lernbasis_eintraege;
