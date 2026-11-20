# Paket Z „Zahlung und Abo“ – Abschlussbericht

**Stand:** 20.11.2026 · **Handoff:** `docs/Neues_Zielbild/handoff-paket-z-zahlung.md` v1.1 · **Bestandsaufnahme:** `docs/billing/abo-discovery.md` · **Einrichtung:** `STRIPE_INTEGRATION_TODO.md` (wird nach J-Z3 gelöscht)

Paket Z ist gebaut, deployt und in der Stripe-Sandbox getestet (J-Z2). Alle 12 Testschritte sind bestanden. **Live ist die Bezahlung nicht:**
- `PAYMENTS_ENABLED` steht im Frontend auf `false`.
- Stripe läuft nur im Testmodus.

Live geht sie erst mit J-Z3, nach dem Anwaltstermin (Fragen 15–21, Teil C) und der Freigabe der Abo-Rechtstexte.

## 1. Was gebaut wurde

| Bereich | Umsetzung |
|---|---|
| Abschluss | `/begleitung`: Monat oder Jahr wählen, gehostete Bezahlseite von Stripe (`create-checkout-session`). Freigeschaltet wird nur über den Webhook; die Seite lädt nach der Rückkehr die Phase neu (alle 3 s, höchstens 10-mal). |
| Webhook | `stripe-webhook`: Zuerst wird die Signatur geprüft (Ausnahme von `requireUser`, im Handoff bestätigt). `stripe_events` sorgt dafür, dass jedes Ereignis nur einmal wirkt. Ausgewertet werden 6 Ereignisse. `plan` setzt ausschließlich der Webhook, `tester` bleibt unangetastet. |
| Verwalten | `create-portal-session`, gehostetes Kundenportal von Stripe (Kündigen, Zahlungsart, Stufe, Laufzeit) |
| Kontingent | Begleitung 150 Nachrichten, intensiv 800, Kulanz 10 in einem Gespräch, Hinweis ab 80 % einmal je Zeitraum. Zeitraum = Monat ab dem Startdatum des Abos (UTC). Krisenantworten werden nie blockiert und nicht gezählt. Fehlgeschlagene Antworten werden zurückgebucht. |
| Konto löschen | Das Abo wird zuerst bei Stripe sofort beendet. Scheitert das, wird nichts gelöscht (`502 subscription_cancel_failed`). |
| Begleitung intensiv | gebaut, abgeschaltet (`INTENSIV_ENABLED`) |
| Datenschutz | Export-Gruppe `abo`, Aufbewahrung (Buchungen und Kontingente 13 Monate, Webhook-Ereignisse 90 Tage), CASCADE auf alle neuen Tabellen |

**Migration 042** `042_z_billing.sql`:
- Tabellen: `subscriptions`, `message_quota_periods`, `message_charges`, `stripe_events` (nur service_role)
- Regelfunktionen `quota_limit_for` / `quota_grace` / `quota_warn_percent` und `current_quota_period`
- `access_state_for` erweitert
- `consume_session` mit Grund `quota`
- `consume_message` / `refund_message`
- `apply_retention` erweitert

**Functions:**
- neu: `create-checkout-session`, `stripe-webhook`, `create-portal-session`, `_shared/stripe.ts`
- geändert: `chat` (Kontingent), `delete-account` (Kündigung), `export-my-data`, `security-monitor` (Regeln in `monitorRules.ts`)
- `rateLimit.ts`: `portal` 10/Stunde

**Frontend:**
- `BegleitungScreen`, `CheckoutButton`, `PortalButton`, `QuotaNotice`, `RestModeSheet` (Zweig für das Kontingent)
- Profilzeile, Satz im Löschdialog
- `src/content/plans.js` (Preise nur zur Anzeige)

## 2. Abweichungen vom Handoff

Vor dem Test begründet im Handoff unter „Beobachtungen“, hier kurz:

1. `tier` kommt aus den Produkt-Metadaten (so in J-Z1 eingerichtet), Rückfall auf den Suchschlüssel.
2. Neue Spalte `subscriptions.cancel_at`. **Im Test bestätigt:** Stripe setzt bei der Kündigung im Portal nur `cancel_at`, nicht `cancel_at_period_end`.
3. `access_state_for` liefert `period_end` (Profil) und `quota_resets_at` (Hinweise) getrennt, weil sie beim Jahresabo auseinanderfallen.
4. Die Grenzwerte stehen in drei SQL-Funktionen im selben Abschnitt statt in einer.
5. Zurückgebucht wird auch, wenn das Speichern der Nutzernachricht scheitert.
6. Ein beendetes Abo nach einer Kontolöschung wird als `stripe_webhook_orphan_ended` geloggt, nicht als Alarm. **Im Test bestätigt** (Test 10, Webhook 200).
7. Eigene Export-Gruppe `abo`.

**Nach dem Test ergänzt** (Branch `fix/paket-z-quota-notice`, von Jerome freigegeben):

8. Der 80-%-Hinweis verschwindet beim nächsten Senden. Sonst blieb „Noch 30 …“ mit veralteter Zahl stehen (Befund Test 3).
9. **Das Eingabefeld bleibt nach erreichter Grenze offen.** Die gesperrte Eingabe verhinderte, dass jemand in einer Krise in der laufenden Ansicht schreiben konnte, obwohl der Server Krisennachrichten durchlässt (Z-E1). Normale Nachrichten lehnt der Server weiter ab; ihr Text kommt zurück ins Eingabefeld, statt zu verschwinden (Befund Tests 4 und 6).

## 3. Testtabelle J-Z2 (Sandbox, 20.11.2026)

Lokal getestet (`npm run dev`, `PAYMENTS_ENABLED` vorübergehend an, `SITE_URL` vorübergehend auf localhost) gegen die deployten Functions und Migration 042. Zwei synthetische Testkonten, nicht die Konten des Angriffstests.

| # | Schritt | Ergebnis | ok |
|---|---|---|---|
| 1 | Begleitung Monat abschließen | Phase Begleitung nach wenigen Sekunden, Profil „verlängert sich am 20.12.2026“. Alle Stripe-API-Aufrufe mit 200, der eingeschränkte Schlüssel reicht. | ✅ |
| 2 | Preise auf `/begleitung` = Stripe | 9,90 € / Monat, 99 € / Jahr | ✅ |
| 3 | `used = 119`, 1 Nachricht | „Noch 30 Nachrichten in diesem Monat.“, Server: `used = 121`, `warned = true` nach 2 Nachrichten, kein zweiter Hinweis | ✅ (+ Fix 8) |
| 4 | `used = 150`, weiterschreiben | Kulanz-Hinweis, `grace_used` zählt hoch. Nach 10 (per SQL abgekürzt) wird die Nachricht abgelehnt, Hinweis „Ab dem 20.12. geht es weiter.“ | ✅ |
| 5 | Neues Gespräch | Ruhemodus-Sheet mit Datum, ohne „Begleitung intensiv“ | ✅ |
| 6 | Krisen-Testsatz bei erschöpftem Kontingent | Krisenantwort kommt (2×), `used = 150` / `grace_used = 10` unverändert | ✅ (+ Fix 9) |
| 7 | Kündigung im Portal | Profil „endet am 20.12.2026“, Phase bleibt; DB `status = active`, `cancel_at` gesetzt | ✅ |
| 8 | Testuhr nach dem Periodenende | `plan = free`, `status = canceled`, `/begleitung` bietet die Bezahlung wieder an (Phase Kennenlernen, weil < 3 Starts) | ✅ |
| 9 | Karte `…0341`, Verlängerung scheitert | `payment_failed` im Log, `status = past_due`, `plan = premium`; nach den Wiederholungen (Stripe: „Abonnement kündigen“) `plan = free`, `status = canceled` | ✅ |
| 10 | Konto mit laufendem Abo löschen | Abo bei Stripe sofort storniert, Webhook `customer.subscription.deleted` 200, `deletion-check.sql`: 36 Zeilen, überall 0 | ✅ |
| 11 | Ereignis erneut senden | Antwort `{"received": true, "duplicate": true}`, keine Doppelwirkung | ✅ |
| 12 | Testuhr über den Abrechnungstag | `subscription_renewed` im Log, Profil „verlängert sich am 20.01.2027“ | ✅ |

**Zu Test 12:** Ob das Kontingent neu beginnt, lässt sich mit der Testuhr nicht prüfen, weil die Datenbank mit der echten Zeit rechnet. Geprüft wurde `current_quota_period(anker, '2026-12-21')`, Ergebnis 20.12.2026–20.01.2027, dazu der PGlite-Test (25 Fälle) beim Bau.

**Angriffstest:** `npm run security:test` → 193 Tests, **189 PASS, 0 FAIL, 4 SKIP**.
Offen: Zuordnung der 4 SKIP-Zeilen. Erwartung: Z1–Z7 sind PASS, denn Webhook-Secret und `PAYMENTS_ENABLED=1` sind gesetzt.

**Löschtest:** Test 10 gilt als Löschtest mit Abo (Entscheidung Jerome, 20.11.2026). Der Skriptlauf mit `DELETION_TEST_SUBSCRIPTION=1` hätte dasselbe geprüft und ein neues Konto C mit Sandbox-Abo gebraucht.

## 4. Offene Aufgaben für Jerome

- **Fix-Branch mergen:** `fix/paket-z-quota-notice` (Fixes 8 und 9 und dieser Bericht)
- **Aufräumen:**
  - `PAYMENTS_ENABLED` in `legalTexts.js` lokal zurück auf `false`
  - Stripe-Simulation löschen
  - Testkonto `+test-a` nach Bedarf löschen
  - `SITE_URL` ist bereits entfernt.
- **Texte freigeben** (alles Vorschläge):
  - Kontingent-Hinweise, Ruhemodus-Text bei aufgebrauchtem Kontingent
  - Satz im Löschdialog, Fehlertext bei `subscription_cancel_failed`
  - Erklärtext der Export-Gruppe `abo`
  - Texte auf `/begleitung` und am Portal-Button
- **Stripe in `DATA_RECIPIENTS`:** Text von Jerome
- **J-Z3:**
  - Anwalt (Fragen 15–21)
  - Live-Modus in Stripe
  - Live-Secrets, `PAYMENTS_ENABLED = true`
  - ein echter Kauf mit Kündigung
  - danach `securityMeasures.js` „Z Zahlung“ auf `live`
- **Nach der Abnahme (Claude Code):**
  - CLAUDE.md (Abschnitt 8, Schema, Functions, Migration 042, Webhook-Ausnahme, Monitoring-Codes)
  - ARCHITECTURE.md
  - `STRIPE_INTEGRATION_TODO.md` löschen

## 5. Beobachtungen

1. **Stripe-Kunde bleibt nach der Kontolöschung bestehen.** Abo und Rechnungen enden bzw. bleiben wie vorgesehen. Bei Stripe bleiben aber auch E-Mail-Adresse, hinterlegte Karte und `user_id` in den Metadaten. Den Kunden zusätzlich zu löschen (`customers.del`) würde Karte und Adresse entfernen; Rechnungen behält Stripe wegen der Aufbewahrungspflichten ohnehin. **Vorschlag:**
   - Frage auf die Anwaltsliste.
   - Wenn gewünscht, als eigener kleiner Schritt in `delete-account` nach der Kündigung.
2. **Kundenportal und Bezahlseite auf Englisch.** Stripe folgt der Browsersprache. Für den Live-Gang `locale: 'de'` in Checkout und Portal setzen (ein Parameter je Function).
3. **Sprachprinzip im Coach.** In einer Antwort stand „Du musst es auch nicht genau wissen“. Der Prompt ist unverändert; das ist ein Thema für eine spätere Prompt-Tranche.
4. **Verlängerungsrechnung ist eine Stunde lang Entwurf.** Stripe bucht erst danach ab. Mit der Testuhr wichtig (Test 9), im Betrieb ohne Folgen.
5. **Wiederholungen bei gescheiterter Zahlung:** in Stripe auf „Abonnement kündigen“ eingestellt, Dauer etwa 14 Tage. So lange bleibt die Begleitung aktiv (Z-9).
6. **Testuhr-Anker in der Zukunft:** Mit der Testuhr liegt `quota_anchor` in 2027. `current_quota_period` nimmt dann den ersten Zeitraum ab dem Anker. Im Betrieb liegt der Anker nie in der Zukunft.
7. **Lokale Entwicklung:** Für `npm run dev` fehlte `.env.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Sie ist jetzt angelegt und steht in `.gitignore`.
8. **Supabase CLI:** v3.2.0 verfügbar (installiert v2.95.4), bewusst nicht mitten im Deploy aktualisiert.
