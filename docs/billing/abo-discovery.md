# Abo-Modell – Bestandsaufnahme (Paket Z, vor dem Handoff)

**Stand:** 20.11.2026 · **Grundlage:** `docs/Abo_Modell/friedensstifter-abo-modell-v1.md`, Abschnitt 6
**Art:** nur Lesen, keine Änderungen am Code. Zeilenangaben beziehen sich auf `main` (Commit 015d319e).

---

## Kurzfassung

- **Starts zählt die Datenbank.** `consume_session` zählt einen Start einmal pro Gespräch. Die 100er-Kappung prüft dagegen `chat` selbst. Sie zählt alle gespeicherten Nachrichten des Gesprächs, also die des Nutzers, die des Coaches und die Eröffnung.
- **Kein eindeutiger Buchungspunkt für eine Nachricht.** Bisher gibt es keine Stelle, an der feststeht, dass eine Nachricht des Nutzers erfolgreich beantwortet wurde. Die Nutzernachricht wird **vor** dem Modellaufruf gespeichert. Die Antwort wird erst im Hintergrund nach dem Stream gespeichert, und ein Fehler beim Speichern der Antwort wird nur geloggt.
- **Echte Nachricht oder Coach-zuerst unterscheidet `chat` sauber:** Nur das Feld `message` im Body ist eine echte Nutzernachricht. `start` und der synthetische Turn tauchen nie als Zeile in `messages` auf.
- **Kein eigener Weg für Innere Stimmen.** Sie laufen im normalen Gespräch über `chat`. Howto läuft auch über `chat`, aber als eigener Modus ohne Speicherung und ohne Zählung.
- **Für Abos gibt es noch nichts:**
  - `plan` erlaubt nur `free`, `premium` und `tester`.
  - Abo-Tabellen und Stripe-Felder gibt es nicht.
  - Die Begleitung hat heute weder eine Grenze noch eine Kappung.
  - Prompt-Caching ist nicht umgesetzt. Das ist die Voraussetzung für „Begleitung intensiv“.

---

## 1. Zählung der Starts und 100er-Kappung

**Starts (`consume_session`):** [038_u4_access_phases.sql:145-193](../../supabase/migrations/038_u4_access_phases.sql#L145-L193)
- Gezählt wird pro Gespräch höchstens einmal. Merkmal dafür ist `conversations.session_counted_at` (Z. 160-171). Ist der Zeitstempel gesetzt, kommt `allowed: true, counted: false` zurück.
- Gegen parallele Starts sperrt die Funktion die Gesprächszeile (`for update`, Z. 163) und die Profilzeile (Z. 174).
- Die Regel kommt aus `access_state_for` (Z. 81-121). Bei `can_start = false` antwortet sie `allowed: false`, sonst gilt `trial_sessions_used + 1` (Z. 183-185). Gezählt wird insgesamt, ohne Monats-Reset (Cron in Z. 196 abgeschaltet).
- `chat` ruft die Funktion **bei jeder Anfrage im Gesprächsmodus** auf, mit dem Token des Nutzers ([chat/index.ts:1512-1530](../../supabase/functions/chat/index.ts#L1512-L1530)). Ausgenommen sind die Starts `first` und `standard`: Sie speichern nur den Pool-Text und kehren vorher zurück (Z. 1289-1310).
  - **Folge:** Ein Start mit `wellness` oder `entry`, bei dem der Coach zuerst spricht, zählt schon als Start, bevor der Nutzer etwas schreibt.
  - `resume` zählt nicht neu, weil das Gespräch schon gezählt ist (es braucht eine eigene Nachricht, Z. 1405-1410).
- Bei Ablehnung kommt `429 { error: 'session_limit', phase }` (Z. 1518-1525). Im Krisenfall geht die Antwort trotzdem raus (Z. 1526).

**Kappung (`c_cap`):** Konstante 100 in [038:89](../../supabase/migrations/038_u4_access_phases.sql#L89). `access_state_for` liefert `cap = null` für `premium` und `tester`, sonst 100 (Z. 116).
- Geprüft wird in [chat/index.ts:1490-1508](../../supabase/functions/chat/index.ts#L1490-L1508) über `history.length >= cap`, und zwar **vor** dem Speichern der neuen Nutzernachricht. Ablehnung: `409 { error: 'conversation_cap', cap }`, nichts gespeichert.
- **Gezählt werden alle Zeilen in `messages`** dieses Gesprächs (`loadHistory`, Z. 1363). Das sind Nachrichten des Nutzers, Antworten des Coaches, Eröffnungen (Pool-Text, Wellness, Entry, Resume) und Krisenantworten. Die Vorgabe „Nutzer + Coach“ ist damit erfüllt, Eröffnungen zählen aber mit.
- Ist `access_state_for` nicht erreichbar, lässt `chat` die Anfrage durch (fail-open, Code `access_state_failed`, Z. 1495-1497). Auch hier gilt die Ausnahme für den Krisenfall (Z. 1501-1506).

## 2. Wo die Nutzernachricht entsteht, und wo man eine Nachricht buchen könnte

Reihenfolge in `chat` für eine Nachricht im Gespräch:

| Schritt | Ort | Bemerkung |
|---|---|---|
| Zustimmung, Rate-Limit | Z. 1237, 1244-1245 | 429 `rate_limited` → nichts gezählt (passt zu Abschn. 2 der Vorgabe) |
| Prüfung auf Wiederholung über `client_message_id` | Z. 1366-1385 | Ist schon eine Antwort da, wird sie aus der DB nachgeliefert (`replayResponse`), **ohne Modellaufruf** |
| Krisenerkennung (Haiku) | Z. 1479-1488 | eigener Modellaufruf, vor allen Grenzen |
| Kappung | Z. 1490-1508 | |
| `consume_session` | Z. 1512-1530 | |
| **Nutzernachricht speichern** | Z. 1532-1559 | `upsert` mit `onConflict: conversation_id,client_message_id`, `ignoreDuplicates` |
| Modellaufruf starten | Z. 1661-1674 | `anthropic.messages.stream(...)`; ein Fehler hier → 500, die Nutzernachricht bleibt gespeichert |
| Stream, dann Antwort speichern | Z. 1701-1755 | im Hintergrund (`EdgeRuntime.waitUntil`, Z. 1762), auch wenn der Client abbricht |

**Ab wann feststeht, dass eine Antwort entstanden ist:** erst in Z. 1739-1751. Dort ist `full` nicht leer, und `messages.insert` der Antwort ist ohne Fehler durchgelaufen.
- Bei leerem `full` (Stream-Fehler) gibt es nur `assistant_empty` (Z. 1753).
- Ein Fehler beim Speichern ist nur geloggt (`assistant_insert_failed`).
- Diese Stelle läuft **nach** dem Ende der HTTP-Antwort. Ein Ergebnis dort kann der Client nicht mehr sehen.

**Ein Sonderfall:** Bei einer Wiederholung ohne gespeicherte Antwort ist `existingUserMessage = true` (Z. 1377-1379). Dann wird das Modell erneut aufgerufen. Eine Buchung braucht also einen Schlüssel pro Nachricht (die `id` der Nutzernachricht), sonst zählt die Wiederholung doppelt.

## 3. Echte Nutzernachricht, Coach-zuerst und synthetischer Turn

- **Echte Nachricht:** Feld `message` im Body (Z. 1251, 1258-1266). Nur damit wird `newMessage` gesetzt und in Z. 1533 gespeichert.
- **Coach-zuerst:** Feld `start` (Z. 1252, `START_VARIANTS` in Z. 1160). `message` und `start` gleichzeitig ergibt 400 (Z. 1254).
  - `first`/`standard`: nur Pool-Text, ohne Modellaufruf.
  - `wellness`/`entry`/`briefing`/`resume`: Modellaufruf ohne Nutzernachricht.
- **Synthetischer Turn:** wird erst beim Aufruf angehängt (`ensureEndsWithUser`, Z. 1668-1673). Er entsteht nur im Arbeitsspeicher und wird nie in `messages` gespeichert.
- **Zuverlässiges Merkmal für eine Buchung:** `newMessage !== null` **und** eine neu gespeicherte Zeile (`!existingUserMessage`), oder besser ein eigener Buchungsschlüssel = `userMessageId`.
- **Altformat** (`isLegacy`, Z. 1269-1273): ist abgeschaltet (`409 client_outdated`). Für die Zählung spielt es keine Rolle.

## 4. Innere Stimmen und Howto

- **Innere Stimmen:** kein eigenes Gespräch. Vorstellung und Benennung passieren im normalen Gespräch mit dem Coach ([chat/index.ts:1582-1629](../../supabase/functions/chat/index.ts#L1582-L1629)). Die Auswahl des Namens schreibt das Frontend direkt in `inner_voices` ([CoachScreen.jsx:478-488](../../src/screens/coach/CoachScreen.jsx#L478-L488)). Eine Nachricht „im Gespräch mit einer Inneren Stimme“ ist technisch eine normale Nachricht.
- **Howto:** läuft über `chat` mit `mode: 'howto'` bzw. `howtoMode: true` ([HowItWorksScreen.jsx:52](../../src/screens/howto/HowItWorksScreen.jsx#L52), [chat/index.ts:1240](../../supabase/functions/chat/index.ts#L1240)). Den Verlauf schickt der Client mit (Z. 1359-1361). Gespeichert wird nichts (`persist` nur bei `isV2`, Z. 1655), und weder `consume_session` noch die Kappung laufen (beide nur `isCoaching`). Es gibt ein eigenes Rate-Limit (`RATE_LIMITS.howto`, 30/Stunde).
- **Gedächtnis-Extraktion** (`mode: 'extract'`, Z. 1320-1349): ein Aufruf mit Haiku, ohne Zählung.

## 5. `profiles.plan`, Schutz-Trigger, `tester` und die Phase

- **Erlaubte Werte:** `CHECK (plan IN ('free', 'premium', 'tester'))`, Constraint `profiles_plan_check` ([010_v2_5.sql:7-11](../../supabase/migrations/010_v2_5.sql#L7-L11)), Standardwert `'free'` ([001_initial.sql:9](../../supabase/migrations/001_initial.sql#L9)).
- **Schutz-Trigger:** Gültig ist die Fassung aus [040_k_consent_v2.sql:50](../../supabase/migrations/040_k_consent_v2.sql#L50). Sie baut auf 024 → 036 → 038 auf.
  - Bei INSERT durch einen Client wird `plan := 'free'` erzwungen (Z. 64).
  - Bei UPDATE durch einen Client führt jede Änderung an `plan` zu `42501` (Z. 85).
  - `service_role` darf `plan` setzen. Das wäre der Weg für den Webhook.
- **Wer `plan` heute setzt:**
  - `redeem_invite_code` → `tester` ([025_rls_hardening.sql:191](../../supabase/migrations/025_rls_hardening.sql#L191))
  - `admin-invite-user` → `tester` ([admin-invite-user/index.ts:88](../../supabase/functions/admin-invite-user/index.ts#L88))
  - Im Admin-Bereich lassen sich **nur** `is_beta_tester` und `session_limit` ändern, nicht `plan` ([admin-users/index.ts:73-81](../../supabase/functions/admin-users/index.ts#L73-L81)).
  - `premium` setzt heute niemand automatisch.
- **Wo `tester` ausgewertet wird:**
  - Server: `access_state_for` ([038:103-116](../../supabase/migrations/038_u4_access_phases.sql#L103-L116)). `tester` ist in der Phase `begleitung`, solange `session_limit` Starts übrig lässt (`null` = unbegrenzt), und hat keine Kappung.
  - Frontend, nur Anzeige: [ProfileScreen.jsx:164, 188, 217-219](../../src/screens/profile/ProfileScreen.jsx#L164), [BetaSurveyScreen.jsx:15](../../src/screens/feedback/BetaSurveyScreen.jsx#L15), [betaSurvey.js:13](../../src/config/betaSurvey.js#L13).
- **Wie die Phase zum Frontend kommt:** `get_access_state()` ([038:124-142](../../supabase/migrations/038_u4_access_phases.sql#L124-L142)) prüft MFA, ruft `access_state_for(auth.uid())` auf und liefert `{ phase, starts_used, starts_limit, can_start, cap }`. Das Frontend liest es mit `useAccessState` ([accessState.js:12-38](../../src/lib/accessState.js#L12-L38)). Ein Feld namens `access_phase` gibt es nicht. Es heißt `phase`.

## 6. Felder und Tabellen für Abo-Daten

Auf `main` gibt es dazu **nichts**: keine Tabelle `subscriptions` und keine Spalten `stripe_customer_id` oder `stripe_subscription_id`. Die Suche nach `subscription|stripe_|billing|customer_id` in Migrationen, Functions und `src` findet nur `supabase.auth.onAuthStateChange` (`subscription` des Auth-Listeners in `useAuth.js:70`) und die Schalter in `legalTexts.js`.

Auf dem Branch `feature/stripe-checkout-geruest` (nicht gemergt) liegen:
- `create-checkout-session`, abgeschaltet hinter `PAYMENTS_ENABLED`
- ein versteckter Button auf `/begleitung`
- `STRIPE_INTEGRATION_TODO.md`

**Abweichungen zur Vorgabe (für Paket Z anzupassen):**
- **Preise:** Das Gerüst kennt nur einen Preis (`STRIPE_PRICE_ID`). Die Vorgabe will 4 Lookup-Keys und die Metadaten `tier`.
- **E-Mail:** Das Gerüst schickt bewusst **keine** E-Mail an Stripe. Die Vorgabe (Abschn. 5) sieht Nutzer-ID **und** E-Mail vor.
- **Kein Webhook:** Laut Vorgabe wird nur über den Webhook freigeschaltet, nie über die Rückkehr-URL. Das Gerüst schaltet nichts frei, das passt.

## 7. Übergangstexte U4 und der Ort für den 80-%-Hinweis

| Text | Komponente | Eingebunden in |
|---|---|---|
| 1 – vor dem letzten Kennenlern-Gespräch | [ConversationEntry.jsx:73](../../src/components/coach/ConversationEntry.jsx#L73), [CoachScreen.jsx:558](../../src/screens/coach/CoachScreen.jsx#L558) | Einstieg bzw. neues Gespräch bis zur ersten Nachricht; „einmalig“ über `TRIAL_LAST_HINT_KEY` ([accessState.js:55](../../src/lib/accessState.js#L55)) |
| 2 – Ende des Kennenlernens | [TrialEndCard.jsx](../../src/components/today/TrialEndCard.jsx) | [HomeScreen.jsx:66, 95-96](../../src/screens/home/HomeScreen.jsx#L66) |
| 3 – Ruhemodus | [RestModeSheet.jsx](../../src/components/access/RestModeSheet.jsx) | [CoachScreen.jsx:507, 631-632](../../src/screens/coach/CoachScreen.jsx#L507) (bei 429 `session_limit`, [useChat.js:161, 400](../../src/hooks/useChat.js#L161)) |
| 4 – Kappung | [ConversationCapNotice.jsx](../../src/components/access/ConversationCapNotice.jsx) | [CoachScreen.jsx:608-613](../../src/screens/coach/CoachScreen.jsx#L608-L613), direkt über `ChatInput` (Z. 616-618) |
| Phase im Profil | [ProfileScreen.jsx:27-34](../../src/screens/profile/ProfileScreen.jsx#L27-L34) | |
| Erklärung | [HowItWorksScreen.jsx:191-195](../../src/screens/howto/HowItWorksScreen.jsx#L191-L195), [BegleitungScreen.jsx:24, 55](../../src/screens/begleitung/BegleitungScreen.jsx#L24) | Text: „Was die Begleitung kostet, steht noch nicht fest“ – anzupassen |

**Vorschlag für den 80-%-Hinweis:** an derselben Stelle wie der Kappungshinweis, also im CoachScreen zwischen den Nachrichten und `ChatInput` ([CoachScreen.jsx:607-618](../../src/screens/coach/CoachScreen.jsx#L607-L618)), als ruhige Zeile ohne Button.
- **Auslöser:** Der Server schickt die Restzahl im ersten SSE-Ereignis `meta` mit (Z. 1694-1698), und zwar nur, wenn die Schwelle gerade überschritten ist. Einen ständigen Zähler gibt es nicht.
- **„Einmalig pro Zeitraum“:** besser serverseitig über einen Zeitstempel am Zeitraum führen, nicht über `localStorage`. Sonst erscheint der Hinweis auf jedem Gerät erneut.
- **Grenze und Kulanz:** Der neue Hinweis und der Ruhemodus-Zustand mit Datum („ab dem 14.04. geht es weiter“) können `ConversationCapNotice` und `RestModeSheet` mit einem eigenen Text-Zweig wiederverwenden.

## 8. Vorschlag: Monatszähler und doppeltes Zählen (nur Text)

**Empfehlung: eine eigene Tabelle pro Zeitraum statt einer Spalte im Profil.**

- **`message_quota_periods`**
  - Spalten: `user_id`, `period_start`, `period_end`, `used`, `grace_conversation_id`, `grace_used`, `warned_at`
  - Schlüssel `(user_id, period_start)`
  - Grund für die Tabelle: Eine Spalte im Profil müsste bei jedem Zeitraumwechsel per Cron oder „lazy“ zurückgesetzt werden, und der Verlauf wäre weg. Mit einer Zeile pro Zeitraum fällt der Reset weg (der neue Zeitraum beginnt mit einer neuen Zeile bei 0). Außerdem lassen sich Kulanz und 80-%-Hinweis sauber pro Zeitraum führen.
- **`message_charges`**
  - Spalten: `message_id` (PK, FK → `messages` ON DELETE CASCADE), `user_id`, `period_start`, `charged_at`
  - Das ist das Buchungsjournal: **eine Buchung pro Nutzernachricht**. Wiederholungen und parallele Anfragen mit derselben `client_message_id` zählen dadurch höchstens einmal (`insert … on conflict (message_id) do nothing`).
- **Abo-Daten** in eigener Tabelle `subscriptions`:
  - `user_id`, `stripe_customer_id`, `stripe_subscription_id`, `tier`, `status`, `quota_anchor`, `current_period_end`, `cancel_at_period_end`
  - nur service_role, gesetzt ausschließlich vom Webhook
  - `access_state_for` liest sie und liefert zusätzlich `tier`, `messages_left` (nur für den Hinweis) und `period_end`.
- **Zeitraum** in SQL berechnen: `quota_anchor + n Monate`. Postgres kürzt bei `+ interval '1 month'` auf das Monatsende (31.01. → 28./29.02.), das ergibt die erwarteten Ankertage. Für Monats- und Jahresabo ist das dieselbe Rechnung. Ein Cron ist nicht nötig.

**Atomar buchen, ohne parallel durchzurutschen:** eine RPC `consume_message(p_user_id, p_conversation_id, p_message_id)`, SECURITY DEFINER, nur `service_role`, aufgerufen aus `chat` **direkt nach dem Speichern der Nutzernachricht und vor dem Modellaufruf** (Z. 1559/1661). In **einer** Transaktion:
1. Zeile des aktuellen Zeitraums anlegen, falls sie fehlt (`insert … on conflict do nothing`), und dann mit `select … for update` sperren. Das serialisiert parallele Anfragen desselben Nutzers.
2. Ist für `p_message_id` schon gebucht → `allowed: true, charged: false` (Wiederholung).
3. Ist `used < limit` → buchen, `used + 1`.
4. Sonst greift die Kulanz: höchstens 10 im Gespräch, in dem die Grenze erreicht wurde (`grace_conversation_id`), mit `grace_used + 1`. Sonst `allowed: false` → `chat` antwortet ähnlich wie bei `session_limit`, Nachricht **nicht** gespeichert. Für die Reihenfolge heißt das: zuerst prüfen, dann speichern, wie heute bei `consume_session`. Die Buchung ist dann ein „Reservieren“ mit Schlüssel `clientMessageId` statt `message_id`.
5. Ergebnis inklusive `remaining` und `warn` (erstes Überschreiten von 80 % → `warned_at` setzen).

**Fehlgeschlagener Modellaufruf (Vorgabe Abschn. 2, letzte Zeile):** gebucht wird vorher, ein Fehlschlag wird **zurückgebucht**. Eine RPC `refund_message(p_message_id)` löscht den Eintrag im Journal und senkt `used` bzw. `grace_used`. Aufgerufen wird sie an zwei Stellen: im Catch von Z. 1661 (Aufruf scheitert sofort) und im Hintergrund bei leerem `full` (Z. 1752-1754). Das ist sicherer als „erst nach Erfolg buchen“, weil sonst zwei parallele Anfragen beide die Prüfung bestehen und die Grenze überschreiten.

**Offene Punkte für das Handoff (Entscheidung bei Jerome):**
- **Krisenfall:** Heute geht eine Krisenantwort an jeder Grenze vorbei (Z. 1501, 1519). Vorschlag: Sie wird auch an der Monatsgrenze nie blockiert. Offen ist, ob sie gebucht wird. Mein Vorschlag: nicht buchen.
- **Starts mit Coach-zuerst** (`wellness`, `entry`, `resume`) kosten einen Modellaufruf, zählen laut Vorgabe aber nicht. Das passt. Nur die Rate-Limits begrenzen sie.
- **Neue Gespräche an der Grenze:** Laut Vorgabe (4.3) starten sie nicht mehr. Dafür braucht `consume_session` bzw. `access_state_for` die Monatsgrenze als zusätzliche `can_start`-Bedingung.
- **Werte von `plan`:**
  - Variante a: `premium` bleibt der eine Abo-Plan, die Stufe steht in `subscriptions.tier`.
  - Variante b: den CHECK um `begleitung` und `intensiv` erweitern.
  - Empfehlung: Variante a. Bestehende Stellen mit `premium` (Profil, Fragebogen, `access_state_for`) bleiben dann gültig.
- **Konto löschen mit laufendem Abo:** `delete-account` müsste das Abo bei Stripe kündigen. Das steht nicht in der Vorgabe.
- **Datenschutz:** Neue Tabellen gehören in die Löschkette, in `EXPORT_TABLES` und gegebenenfalls in `apply_retention`. Für Rechnungsdaten gibt es Aufbewahrungsfristen. Stripe kommt als Empfänger in `DATA_RECIPIENTS`, der AVV nach `docs/DPA/`.

## Beobachtungen

- **Prompt-Caching fehlt:** Kein `cache_control` in `supabase/functions`. `coach_usage` loggt zwar `cacheReadTokens` (chat Z. 1723), der Wert ist aber immer 0. Laut Vorgabe 1 ist das die Voraussetzung, um „Begleitung intensiv“ live zu schalten.
- **Kappung pro Gespräch:** In der Begleitung entfällt sie heute vollständig (`cap = null`). Laut Vorgabe gilt in der Begleitung nur die Monatsgrenze, das passt.
- **Spracheingabe:** Die Zeile „getippt oder per Spracheingabe“ in Vorgabe 2 betrifft heute nur Text, die Spracheingabe ist aus (`VOICE_MISTRAL_ENABLED = false`).
- **Abo-Texte:** `HowItWorksScreen` (Z. 195) und `BegleitungScreen` (Z. 24, 55) nennen „drei Gespräche“ und „Preis steht noch nicht fest“. Mit Paket Z kommen neue Texte. Rechtstexte zum Abo liegen hinter `PAYMENTS_ENABLED` und brauchen die Freigabe.

---

⛔ **STOPP:** Ergebnis an Jerome. Das Handoff „Paket Z – Zahlung“ wird auf dieser Grundlage geschrieben.
