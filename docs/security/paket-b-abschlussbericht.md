# Security-Paket B – Abschlussbericht

> Stand: 19.11.2026 · Auftrag: `docs/security/handoff-security-paket-b.md` · Lösungsdesign: `docs/security/friedensstifter-security-paket-b-design-v1.md` · Bestandsaufnahme: `docs/security/paket-b-discovery.md`
> Entscheidungen D-1 bis D-7: alle nach Empfehlung (Jerome, 19.11.2026).

## 1. Status je Maßnahme

| ID | Status | Was umgesetzt wurde | Abweichung vom Handoff + Grund |
|---|---|---|---|
| S-06 | **erledigt** | `requireAdmin` verlangt zusätzlich den JWT-Claim `aal = 'aal2'` (`403 mfa_required`, geloggt). Frontend: `useAdminMfa`, `AdminMfaScreen` (Einrichten mit QR/Schlüssel, Code-Abfrage, zweites Gerät), `AdminRoute` mit MFA-Schritt, `AdminMfaContext`. `AdminUsersScreen` zeigt Ladefehler statt leerer Liste und reagiert auf `mfa_required`. | Zusätzlich behoben: stilles Scheitern im Admin-Bereich (Discovery-Befund). |
| S-08 | **erledigt** | `vercel.json`: HSTS, nosniff, Referrer-, Permissions-Policy, COOP, X-Frame-Options, **erzwingende CSP** (nur `self` + Supabase, `upgrade-insecure-requests`). Bestehende Rewrites/Cache-Header erhalten. `linkify()` mit `safeHref`-Allowlist. Angriffstest prüft die Header (`HDR`). | **CSP-Beobachtungswoche übersprungen** (Jerome, 19.11.): keine aktiven Nutzer; Brüche fallen bei den nächsten Tests auf. Code-Analyse: keine externen Quellen außer Supabase, keine Inline-Skripte, kein `dangerouslySetInnerHTML`. |
| S-10 | **erledigt** | DM Sans / DM Serif Display per `@fontsource`; Google-Links aus `index.html` und Workbox-Regel entfernt; im Build keine Google-URL. | – |
| S-12 | **erledigt** | Welle 2a: `chat` mit neuem Format (`message` + `clientMessageId` bzw. `start`), Verlauf aus der DB, Nutzer-Nachricht idempotent gespeichert, Antwort per `waitUntil` zu Ende generiert und gespeichert (D-7), Retry liefert gespeicherte Antwort, Standard-Eröffnung serverseitig ohne Modellaufruf/Zählung. `post-conversation` und Extraktion lesen aus der DB. Frontend ohne `messages`-Writes, „Nicht gesendet – nochmal versuchen“. Welle 2b: Migration 031 (Client nur noch SELECT), altes Format → `409 client_outdated`. | **Welle 2b vorgezogen** (statt ≥ 48 h): Aktivitätsprüfung ergab keine echten Nutzer seit 02.09.2026; alle 12 `legacy_format`-Aufrufe stammten aus dem Angriffstest. **Index nicht partiell** (PostgREST kann `ON CONFLICT` sonst nicht auflösen). **Neuer Start `first`/`standard`**: Die App schrieb den Pool-Begrüßungstext bisher selbst als Coach-Nachricht (nicht im Handoff). `consume_session` läuft **vor** dem Speichern der Nutzer-Nachricht (sonst bliebe sie bei erreichtem Limit liegen). |
| S-13 | **erledigt** (Stichprobe offen) | Migration 032: Opt-in-Felder (nur über RPC `set_learning_opt_in`, Rücknahme löscht in derselben Transaktion), `experience_patterns.source_user_id` (CASCADE) + `review_status`, Bestand gelöscht (D-2), `match_experiences` nur `approved` und ohne Zuordnung. `_shared/learning.ts` (Vorfilter + Haiku, fail-closed). RAG-Block als gekennzeichneter Datenblock. Supervision mit harten Regeln + Prüfschritt; Prompt von Jerome freigegeben. Opt-in-Karte im Profil (Texte wörtlich nach Design 5.3). `RAG_LEARNING_ENABLED=1` und `SUPERVISION_IN_PROMPT=1` gesetzt. | Unterwegs behoben: Ablehnungsgründe wurden vom Log-Filter zu `{type,length}` reduziert → jetzt als Text; Haiku-Antwort mit Text um das JSON führte zu `review_failed` → JSON wird herausgelöst, Fehler getrennt als `review_api_failed`/`review_parse_failed`; leere Zusammenfassung → `learning_no_summary`. |
| S-15 | **erledigt** (Löschung inaktiver Konten wartet auf S-22) | Migration 033: `profiles.invited_by` → SET NULL (blockierte das Löschen des Einladenden), `user_feedback.user_id` und `coach_reflections.conversation_id` → CASCADE. `apply_retention()` + Cron `apply-retention` (Fristen D-4). `inactive_accounts_report()`, Anzahl im Admin-Bereich. `delete-account` mit Fehlercode. Löschtest (`npm run security:deletion-test` + `deletion-check.sql`). | **Zusätzlich (Entscheidung Jerome 19.11.):** `supervision_logs.raw_reflections` (Volltext-Kopie, nirgends gelesen, überlebte die Löschung) wird nicht mehr gespeichert und wurde geleert; stattdessen **geprüftes Gesamtprotokoll** `protocol_text`, sichtbar im Admin-Bereich (Tab Feedback → Supervision). |

## 2. Befunde aus Phase 0 und unterwegs, die neu oder anders als erwartet waren

1. **S-12 war schon teilweise erledigt** (Mig. 028: Kontext serverseitig, `rag-search` entfernt). Offen war genau der Verlauf- und Schreibteil.
2. **Client schrieb die Standard-Begrüßung als Coach-Nachricht** — ohne Insert-Recht wäre sie verloren gegangen → Server-Start `first`/`standard`.
3. **Admin-Bereich verschluckte Fehler** (keine `res.ok`-Prüfung) — ein `mfa_required` wäre unsichtbar geblieben.
4. **`profiles.invited_by` NO ACTION** — Jeromes eigenes Konto wäre nicht löschbar gewesen, solange Eingeladene existieren.
5. **`coach_reflections` verwaisten** nach Kontolöschung (SET NULL, keine `user_id`); `supervision_logs.raw_reflections` kopierte sie zusätzlich im Volltext.
6. **Client-Idempotenz von `post-conversation`** (`processedRef`) blockierte jede spätere Nachbearbeitung, sobald ein früher Tab-Wechsel sie einmal ausgelöst hatte → merkt sich jetzt die Nachrichtenzahl.
7. **Unversionierte Imports** in den Edge Functions: Ein Deploy scheiterte, weil eine frisch veröffentlichte `supabase-js`-Version ein noch nicht abrufbares Unterpaket zog → feste Versionen (`supabase-js` 2.119.0, `anthropic-sdk` 1.10.0), Regel in CLAUDE.md.
8. **Angriffstest wertete Netzwerkaussetzer als „kein Zugriff“ (PASS)** → Wiederholung, Netzwerkfehler zählen als FAIL.
9. **Den Spiegel-Einstieg ins Gespräch gibt es nicht** (`entryContext.source = 'spiegel'` vorgesehen, aber von keinem Screen genutzt).
10. **Ein Auth-Konto ohne Profilzeile** (registriert 22.03.2026, vermutlich Überbleibsel vor dem Passwort-Fix) — harmlos.
11. **Deploy-Panne Welle 3:** Die Schrittliste hatte `db push`/Deploy vor dem Merge → CLI meldete „up to date“, Migration 032 fehlte, `PGRST202`. Behoben; Anleitungen nennen jetzt immer zuerst den Merge.

## 3. Geänderte Dateien und Migrationen

**Migrationen:** `030_s12_server_messages.sql`, `031_s12_revoke_client_message_insert.sql`, `032_s13_learning_base.sql`, `033_s15_cascade_and_retention.sql`

**Edge Functions:** `chat` (neues Format, Verlauf/Speicherung, RAG-Block), `post-conversation` (Verlauf aus DB, Lernbasis-Pfad), `supervision` (Regeln, Prüfschritt, Protokoll), `admin-users` (`inactiveCount`), `admin-feedback` (Supervision-Protokolle), `admin-invite-user` (Log `mfa_required`), `delete-account` (Fehlercode); neu `_shared/learning.ts`; geändert `_shared/auth.ts` (`requireAdmin` mit aal2), `_shared/logger.ts` (feste Version); alle Imports versioniert.

**Frontend:** `src/hooks/useChat.js` (neu geschrieben), `src/hooks/useAdminMfa.js` (neu), `src/screens/admin/AdminMfaScreen.jsx` (neu), `src/screens/admin/AdminUsersScreen.jsx`, `src/App.jsx` (`AdminRoute`), `src/screens/coach/CoachScreen.jsx`, `src/components/coach/CrisisResponseCard.jsx`, `src/components/profile/LearningConsentCard.jsx` (neu), `src/screens/profile/ProfileScreen.jsx`, `src/lib/consent.js` (neu), `src/main.jsx`, `index.html`, `vite.config.js`, `vercel.json`, `package.json` (`@fontsource/*`, Script `security:deletion-test`)

**Tests/Werkzeuge:** `scripts/security/attack-test.mjs` (S12-a–d, 5b, S13-a–c, S15, HDR, Netzwerk-Härtung), `scripts/security/deletion-test.mjs` (neu), `supabase/security/paket-b-audit.sql`, `supabase/security/deletion-check.sql`, `.env.security.example`

**Doku:** `ARCHITECTURE.md`, `CLAUDE.md` (inkl. Doku-Lücken aus Paket A: Migrationen 022–029 im Projektbaum, `_shared`-Module, veraltete Ein-Client-Passage, Mail-Vorlagen), `docs/security/paket-b-discovery.md`, `docs/security/supervision-prompt.md`

## 4. Tests

- **Angriffstest:** 119 PASS / 0 FAIL / 1 SKIP (19.11.2026, nach Welle 4; SKIP = `supervision`, nur mit `ATTACK_TEST_SUPERVISION=1`). Die Header-Prüfung `HDR` kommt mit der CSP-Umstellung dazu und ist nach deren Deploy einmal zu bestätigen.
- **Löschtest:** Konto C mit Opt-in, zwei Gesprächen, Nachbearbeitung, Erkenntnis und Feedback → `delete-account` 200, Login danach `invalid_credentials`. `deletion-check.sql`: **31 Prüfpunkte, überall 0** (vorher nicht messbar; bekannte Lücken: `coach_reflections`, `user_feedback`, `invited_by` — mit 033 geschlossen).
- **Opt-in (J-5):** b) harmloses Gespräch → 1 Eintrag · c) Gespräch mit Telefonnummer → Eintrag gespeichert, enthält aber nachweislich **keine** Nummer/Mail/Link (die Zusammenfassung verallgemeinert vorher; der Vorfilter ist zweite Linie und lokal geprüft) · d) Rücknahme → „2 Beiträge wurden gelöscht“, danach 0.
- **Offline-Test (J-3):** „Nicht gesendet“ erscheint, erneutes Senden → genau eine Nachricht und eine Antwort.
- **CSP-Woche:** übersprungen (siehe S-08). Gemeldete Quellen: keine.
- **`legacy_format`-Zähler vor Welle 2b:** 12, alle aus dem Angriffstest (#7, #8, #17); echte Nutzer zuletzt aktiv am 02.09.2026.

## 5. Offene Aufgaben für Jerome

- [ ] **CSP-Umstellung deployen** (`git merge security/paket-b-abschluss && git push`), danach App kurz durchklicken und `npm run security:test` (HDR alle PASS).
- [ ] **Datenschutzerklärung anpassen (R-2)** — aktuelle Fassung (`DatenschutzScreen.jsx`) ist unvollständig:
  - **OpenAI fehlt:** Die erste Nutzer-Nachricht eines Gesprächs wird für die Ähnlichkeitssuche an OpenAI (Embeddings) übermittelt; ebenso die verallgemeinerten Lernbasis-Einträge.
  - **Lernbasis** (Opt-in, pseudonymisiert — nicht „anonym“, Rücknahme jederzeit) beschreiben.
  - **Speicherdauer** nach D-4 (Krisen-Ausschnitt 90 Tage, Krisen-Ereignis 3 Jahre ab Jahresende, Reflexionen 12 Monate, Supervision/Feedback 24 Monate, Logs 30 Tage) statt „bis zu 90 Tage“; Kontolöschung erfolgt sofort, nicht „innerhalb von 30 Tagen“.
  - Aussage „Zero Data Retention Policy von Anthropic“ prüfen — gilt nur mit entsprechender Vereinbarung.
  - Schriften liegen jetzt lokal (kein Google-Fonts-Hinweis nötig).
- [ ] **Fristen und Opt-in-Text mit Anwalt bestätigen** (R-1, R-4).
- [ ] **Stichprobe Lernbasis** (5–10 Einträge) fachlich prüfen, sobald echte Nutzer beitragen.
- [ ] **Erstes Supervision-Protokoll** nach dem nächsten Montag 06:00 im Admin-Bereich ansehen (Tab Feedback → Supervision).
- [ ] **MFA-Notfallweg** im Notfallplan festhalten (Faktoren im Supabase-Dashboard entfernen; setzt MFA am Supabase-Konto voraus) — S-22.
- [ ] **Supabase CLI** von 2.95.4 auf die aktuelle Version aktualisieren (bewusst bis nach Paket B verschoben) und danach einen Probe-Deploy machen.
- [ ] **Repo aus OneDrive verschieben** (z. B. `C:\dev\CoachingApp`) oder `git config gc.auto 0` — OneDrive blockiert Git-Aufräumarbeiten.
- [ ] Optional: Auth-Konto ohne Profil (22.03.2026) im Dashboard löschen.

## 6. Offene Fragen / Entscheidungen / Folgethemen

- **S-22 Monitoring:** Alarme für `assistant_insert_failed`, `mfa_required`-Häufung, `learning_rejected`/`review_*_failed`, Rate-Limit fail-open, `coach context partially unavailable`; Mailkanal für den Hinweis vor Löschung inaktiver Konten (dann Löschung inaktiver Konten aktivieren).
- **S-16 / S-20** (Datenexport, protokollierte Einsicht) bauen auf `requireAdmin` + aal2 auf.
- **Paket C (klein):** S-09 (Frankfurt-Region), S-11 (Datenschutz-Korrekturen — siehe R-2 oben), S-07 (sobald Pro-Plan + Cloudflare).
- Aus Paket A weiter offen: `consume_session` nur über `service_role`, `crisis_events.excerpt`-Länge, `vector`-Extension aus `public`, `post-conversation` `voice_id`-Bug.
- **Spiegel-Einstieg** ins Gespräch: gewünscht? Der Server unterstützt `entryContext.source = 'spiegel'` bereits.
- **Paket-Updates:** `supabase-js`/`anthropic-sdk` sind fest auf 2.119.0 bzw. 1.10.0 — Updates bewusst einplanen.
