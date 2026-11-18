# Security-Paket A – Abschlussbericht

**Stand:** 18.11.2026 · Branch `security/paket-a` · Grundlage: Handoff „Security-Paket A (S-01 bis S-04)“
**Ergebnis:** Alle vier Maßnahmen umgesetzt und deployed. Angriffstest nach Paket A: **104 PASS · 0 FAIL · 0 SKIP** (inkl. `supervision`). Smoke-Tests von Welle 1 und Welle 2 bestanden.
Details zur Bestandsaufnahme: [`paket-a-discovery.md`](paket-a-discovery.md).

---

## 1. Status je Maßnahme

| ID | Status | Was umgesetzt wurde | Abweichung vom Handoff + Grund |
|---|---|---|---|
| **S-01** | erledigt | Sitzungszähler nur noch serverseitig: RPC `consume_session` (atomar, idempotent pro Konversation über `conversations.session_counted_at`), aufgerufen von `chat` mit dem Nutzer-Token. Client-Zähler `countSession()` entfernt. Schutz-Trigger `trg_protect_profile_privileges` sperrt `id`, `is_admin`, `is_beta_tester`, `plan`, `session_limit`, `sessions_used_this_month`, `invited_at`, `invited_by`, `consent_ip`, `created_at` für Clients (`42501`). Signup schreibt nicht mehr per Upsert in `profiles` (Name als Auth-Metadaten an den Trigger). | Migrationen **023/024** statt 022/023 (022 war belegt). Zusätzlich geschützt: `consent_ip`, `created_at`. **Zusätzlicher Schutz-Trigger auf `conversations`** (`session_counted_at`, `post_processed_*`): Ohne ihn hätte ein Client beim Insert `session_counted_at` mitschicken und nie gezählt werden können. **Monats-Reset-Cron neu angelegt** – er existierte nicht, obwohl die Doku ihn beschrieb. Zählregeln nach Entscheidung vom 18.11. (erster `chat`-Aufruf zählt; „Neues Gespräch“ zählt jetzt mit; Krisenantwort, Howto, Extraktion trotz Limit). |
| **S-02** | erledigt | Live-Audit + Security Advisor ausgewertet, Angriffstest `npm run security:test` (103 Prüfungen). Migration **025**: alle Policies ersetzt (nur `to authenticated`), GRANTs nach tatsächlicher Frontend-Nutzung, `anon` ohne Tabellenrechte, per Dashboard angelegte Policies entfernt, View `feedback_survey_scores` mit `security_invoker` und ohne Client-Zugriff, `redeem_invite_code`/`match_experiences` nur `service_role`, fester `search_path` für alle Funktionen. | Soll-Matrix an Nutzung angepasst: `session_notes` + `coachee_profile` brauchen SELECT (Spiegel, Verlauf); `resonance_map` ohne Client-Rechte; `user_feedback`/`feedback_surveys` nur INSERT (SELECT ungenutzt); `profiles` ohne INSERT/DELETE; `conversations` ohne DELETE; `insights`-Insert prüft zusätzlich, dass `conversation_id` eigene ist. `crisis_events` behält die Deny-Policy (gilt formal für `public`, verweigert aber alles). **Offen:** Extension `vector` liegt weiter im Schema `public` (Advisor-WARN) – Verschieben ändert Spaltentypen/Index von `experience_patterns`, braucht eigenes Wartungsfenster. Realtime: Publikation war leer, nichts zu tun. |
| **S-03** | erledigt | `_shared/auth.ts` (`requireUser`, `assertConversationOwner`, `requireAdmin`, `requireInternalCaller`, `readJsonBody`, `validateMessages`, `errorResponse`). Alle **10** Functions umgestellt. `post-conversation` ignoriert `body.userId` (Abweichung wird als `userId mismatch` geloggt), prüft Eigentum vor jedem Zugriff und übernimmt IDs aus der Modellausgabe nur, wenn sie dem Nutzer gehören. `rag-search` und `supervision` geschlossen. Frontend sendet kein `userId` mehr. | `chat`: Bei mehr als 60 Nachrichten werden nur die letzten 60 ans Modell gegeben statt `413` – sonst wären Gespräche ab ca. 30 Runden abgebrochen. Harte Grenzen bleiben (200 KB, 8.000 Zeichen/Nachricht, 400 Einträge). `conversationId` im Gesprächsmodus Pflicht (Entscheidung). `post-conversation`: `conversationId` Pflicht, verarbeitet max. 200 Nachrichten. **Prompt-Injection-Schutz** für Modell-IDs ergänzt (Befund K-6, nicht im Handoff). `supervision`: Cron schickt `x-cron-secret` aus **Supabase Vault** statt Klartext. `supabase/config.toml` hält `verify_jwt = false` fest (ohne Datei schaltet `functions deploy` den Schalter wieder ein). Fehlerantworten nur noch als Code, ohne `error.message`. |
| **S-04** | erledigt | Rohausgabe-Preview entfernt, `runPrompt` loggt nur `label`, `parse_failed`, `outputLength`, `position`. E-Mail-Adressen, Einladungscodes, Akte-Labels, Muster, Antwortkörper aus allen Logs entfernt. `sanitizeLogData()` + `describeError()` in beiden Loggern. Frontend-Logger schreibt nur eingeloggt, warnt bei Fehlern einmalig. Migration **026**: `app_logs` nur Insert eigener Zeilen, `metadata` ≤ 8 KB, ~5.068 Zeilen > 30 Tage gelöscht, Inhaltsschlüssel im Rest entfernt, Cron `purge-app-logs` täglich. | JSON-Spalte heißt `metadata` (nicht `data`). Redaction-Liste um `details`, `hint`, `body`, `topic`, `name`, `pattern` erweitert (Postgres-Fehler können in `details` ganze Zeilen enthalten). `chat` nutzt jetzt `_shared/logger.ts` statt eines eigenen Inline-Loggers. |

---

## 2. Befunde aus Phase 0, die neu oder anders als erwartet waren

**Kritisch (alle behoben):**
- **K-1** `post-conversation` hatte **gar keine** Auth-Prüfung; `userId` aus dem Body, alle Writes mit service_role → jede Person mit der URL konnte fremde Coach-Akten beschreiben und KI-Kosten erzeugen. Baseline: HTTP 200 ohne Login.
- **K-2** `redeem_invite_code(p_code, p_user_id)` (SECURITY DEFINER) war für **anon und authenticated** direkt per RPC aufrufbar → beliebige Konten auf `tester` setzen, Codes durchprobieren.
- **K-3** `profiles` mit `FOR ALL`-Policy ohne Spaltenschutz → jeder Nutzer konnte sich `is_admin = true` setzen (und damit alle E-Mails/Feedbacks im Admin-Bereich sehen). Baseline: 4× „geändert“.
- **K-4** `rag-search` und `supervision` ohne Auth-Prüfung.
- **K-5** View `feedback_survey_scores` ohne `security_invoker`, `authenticated` mit SELECT → **jeder eingeloggte Nutzer sah alle Fragebogen-Antworten aller Nutzer** (Baseline: 28 fremde Zeilen; Security Advisor: ERROR).
- **K-6** `post-conversation` übernahm `entry_id`/`cluster_entry_ids`/`existing_voice_id` aus der Modellausgabe ohne Eigentumsprüfung (Prompt-Injection-Fläche).
- **K-7** Sitzungslimit über den Button „Neues Gespräch“ ohne jede Manipulation umgehbar; Zähler per nicht-atomarem Client-Update.

**Infrastruktur / Drift:**
- Migrationen 001–022 waren per SQL-Editor eingespielt, nicht in der Migrationshistorie → `db push` scheiterte; per `supabase migration repair` korrigiert.
- Per Dashboard angelegte Policies („Service role full access“ auf 8 Tabellen, „Service role can insert app_logs“) und per Hand beschnittene anon-Rechte – nicht im Repo. Jetzt durch 025/026 ersetzt, Repo = Live.
- **`pg_net` war nicht installiert** → der Cron `weekly-supervision` konnte nie laufen. Er schickte außerdem den Publishable-Key als Bearer.
- **Kein Monats-Reset-Cron** vorhanden; `sessions_used_this_month` wurde nie zurückgesetzt.
- `authenticated` hatte volle Rechte (inkl. `TRUNCATE`) auf **allen** Tabellen inkl. `crisis_events`, `invite_codes` – geschützt nur durch RLS.
- `supabase functions deploy` ohne `config.toml` schaltet „Verify JWT“ ein (beim ersten Deploy passiert, sofort mit `--no-verify-jwt` korrigiert).
- `.env.local` ist eingecheckt (nur URL + `sb_publishable_…`, öffentlich gedacht); 7 ZIP-Snapshots im Repo-Root (ohne `.env`/Logs). In der gesamten Git-Historie keine Secret-Keys gefunden.

**Funktionale Fehler im Bestand (nebenbei gefunden):**
- `post-conversation`: `.update().select('id', { count })` liefert mit aktueller supabase-js keinen Count → neue Stimmen-Kandidaten wurden vermutlich sofort wieder gelöscht. **Behoben.**
- Admin-Screen meldete Erfolg auch bei Speicherfehler. **Behoben.**
- `delete-account` ignorierte Fehler der Einzel-Deletes. **Behoben** (bei Fehler bleibt der Account bestehen, Wiederholung möglich).
- `post-conversation` lädt `coach_file_entries` ohne `voice_id`, filtert aber darauf → bereits verknüpfte Einträge werden erneut geclustert. **Nicht behoben** (kein Security-Thema, siehe Abschn. 6).
- Mein Angriffstest meldete Testkonten anfangs per globalem `signOut()` ab und beendete so auch Browser-Sitzungen (Ursache des kurzen `invalid_token` beim Smoke-Test). **Behoben** (`scope: 'local'`).

**Doku-Abweichungen:** CLAUDE.md beschrieb einen Reset-Cron, der nicht existierte, und behauptete, alle Functions nutzten `_shared/logger.ts`. CLAUDE.md nennt als Arbeitsverzeichnis `f:/…` (tatsächlich `c:/Users/…/OneDrive/…`). `docs/architecture.md` (alt) existiert parallel zu `ARCHITECTURE.md`.

---

## 3. Geänderte Dateien und Migrationen

- **Migrationen:**
  - `023_session_counting.sql` – `session_counted_at`, `consume_session`, Schutz-Trigger `conversations`, `pg_net`, Cron `reset-monthly-sessions` + `weekly-supervision` (Vault)
  - `024_protect_profile_privileges.sql` – Schutz-Trigger `profiles`
  - `025_rls_hardening.sql` – Policies, GRANTs, View, Funktionen
  - `026_app_logs_hardening.sql` – `app_logs`-Policy, Größenlimit, Bereinigung, Cron `purge-app-logs`
- **Functions:** neu `_shared/auth.ts`; geändert `_shared/logger.ts`, `chat`, `post-conversation`, `pre-session-briefing`, `rag-search`, `validate-invite-code`, `delete-account`, `admin-users`, `admin-feedback`, `admin-invite-user`, `supervision`; neu `supabase/config.toml`
- **Frontend:** `src/lib/logger.ts`, `src/hooks/useAuth.js`, `src/hooks/useChat.js`, `src/screens/coach/CoachScreen.jsx`, `src/screens/onboarding/Step4Auth.jsx`, `src/screens/admin/AdminUsersScreen.jsx`
- **Security-Werkzeuge:** `scripts/security/attack-test.mjs`, `.env.security.example`, npm-Script `security:test`, `supabase/security/audit.sql`, `supabase/security/audit-combined.sql`
- **Doku:** `ARCHITECTURE.md` (Abschn. 4.4, 5, 6, 9, 10, 11), `CLAUDE.md` (Sicherheitsmuster, Log-Regel, Deployment, Migrationen), `docs/security/paket-a-discovery.md`, dieser Bericht

Verifikation: `npm run build` fehlerfrei; alle 10 Functions bestehen `deno check`; Migrationen 023–026 vom PostgreSQL-Parser (libpg-query) geprüft und fehlerfrei eingespielt.

---

## 4. Angriffstest

| Lauf | PASS | FAIL | SKIP | FAILs |
|---|---|---|---|---|
| **Baseline** (vor Paket A, 17:22) | 87 | 14 | 2 | Fragebogen-View (28 fremde Zeilen), 4× Profilfelder, `post-conversation`/`chat` mit fremder Konversation, `redeem_invite_code` ×2, anon-Insert `app_logs`, `post-conversation`/`rag-search` ohne Auth ×4 |
| Nach Welle 1 (18:00) | 94 | 8 | 1 | Profilfelder ×4, Fragebogen-View, `redeem_invite_code` ×2, anon-Insert `app_logs` (alle für Welle 2 erwartet) |
| Nach Paket A (18:18) | 102 | 0 | 1 | – (SKIP: `supervision`, Flag wegen Leerzeichen aus cmd.exe nicht erkannt; Skript korrigiert in `a8fef8f`) |
| **Nach Paket A, inkl. Supervision** (18:22) | **104** | **0** | **0** | – |

---

## 5. Offene Aufgaben für Jerome (Checkliste)

- [x] **J-1** Audit-SQL ausgeführt und Ergebnis übergeben
- [x] **J-1** Security-Advisor-Warnungen übergeben
- [x] **J-2** Zwei Testkonten angelegt, `.env.security.local` befüllt, Baseline-Test gelaufen
- [x] **J-3** Migration 023 eingespielt, Functions deployed (`--no-verify-jwt`), Frontend gemergt
- [x] **J-3** `CRON_SECRET` gesetzt (Function-Secret + Vault `cron_secret`)
- [x] **J-3** Smoke-Test Welle 1 bestanden
- [x] **J-4** Backup vor Welle 2 vorhanden (tägliches Backup 18.11. 03:55 UTC + Audit-CSV als Schema-Referenz)
- [x] **J-4** Migrationen 024–026 eingespielt
- [x] **J-4** Smoke-Test Welle 2 bestanden (Profil, Insights, Stimmen, Feedback, Einladung, Invite-Code, Verlauf)
- [x] **J-4** `pg_cron` aktiv, Job `purge-app-logs` sichtbar
- [x] **J-5** Angriffstest mit Supervision: 104 PASS · 0 FAIL · 0 SKIP
- [ ] **J-5** Optional: Supervision-Cron einmal per SQL auslösen und `net._http_response` prüfen (erwartet `200`)
- [x] **J-5** Security Advisor erneut geprüft (18.11.2026, 18:24): `extension_in_public` (vector, offen), `auth_leaked_password_protection` (S-07), INFO „RLS enabled, no policy“ für 5 Tabellen (gewollt) und `authenticated_security_definer_function_executable` für `consume_session` (gewollt, siehe Abschn. 6)
- [ ] **J-5** Doku-Commits nach `main` mergen und pushen (`18aa3bb`, `a8fef8f` und dieser Bericht)
- [ ] Leere Datei `schema-vor-welle2.sql` im Projektordner löschen
- [ ] Alte lokale Log-/CSV-Exporte mit Inhalten löschen (Laptop, Chat-Uploads). Die Audit-CSV enthält nur Metadaten und kann als Schema-Referenz bleiben.
- [ ] Entscheiden: `.env.local` und die 7 ZIP-Archive aus dem Repo entfernen (`git rm --cached`, lokale Dateien bleiben). Keine Rotation nötig – es lag kein Secret-Key im Repo.
- [ ] Mail-Zustellung: Invite-Mail landete im Spam → eigener SMTP-Absender mit SPF/DKIM (z. B. Resend, Postmark, Brevo) vor Start der zahlenden Phase
- [ ] Optional: Supabase CLI aktualisieren (installiert 2.95.4, verfügbar 3.2.0)

---

## 6. Offene Fragen / Entscheidungen

- **S-12 – erledigt am 18.11.2026** (Migration 028, Branch `security/s-12-server-context`): `chat` lädt den Kontext selbst, `pre-session-briefing` liefert nur Eckdaten, `rag-search` entfernt, BLOCK 5 hinter Schalter `SUPERVISION_IN_PROMPT`, Briefing in jedem Folgegespräch. Ursprünglicher Befund: `chat` übernimmt `memory`, `coachFile`, `briefing`, `ragContext`, `supervisionNote`, `entryContext` weiterhin aus dem Body in den System-Prompt. Ein Nutzer kann damit nur seinen **eigenen** Prompt manipulieren, aber die Resonanzkarte (eigentlich „unsichtbar“) geht dafür an den Client, und `supervisionNote` wird vom Frontend nie gesendet (BLOCK 5 faktisch inaktiv). Empfehlung: Kontext serverseitig in `chat` laden.
- **Rate-Limits:** `validate-invite-code` ist nur noch über die Function erreichbar, hat aber kein Limit gegen Durchprobieren von Codes; ebenso keine Limits pro Nutzer für `chat`/`extractMemory`/Howto (Kosten). Vorschlag für ein späteres Paket.
- **Kosten bei erreichtem Limit:** Weil die Krisenerkennung jetzt vor der Limit-Prüfung läuft, kostet jede blockierte Nachricht einen Haiku-Aufruf. Bewusst in Kauf genommen (Krisenantwort hat Vorrang).
- **`crisis_events.excerpt`** speichert 300 Zeichen Nutzertext (kein Log, sondern Krisenprotokoll). Aus Datenschutzsicht prüfen: Aufbewahrungsfrist und ob 300 Zeichen nötig sind.
- **`vector` aus `public` verschieben** – eigenes Wartungsfenster.
- **Advisor-WARN `consume_session` für `authenticated` ausführbar:** gewollt (Handoff 4.4) – `chat` ruft sie mit dem Nutzer-Token auf, damit `auth.uid()` gesetzt ist. Ein direkter Aufruf wirkt nur auf eigene Konversationen (fremde → `42501`, Angriffstest #11); schlimmstenfalls verbraucht ein Nutzer sein eigenes Kontingent. Optionale Verbesserung: Signatur `consume_session(p_user_id, p_conversation_id)`, nur `service_role` ausführbar, Aufruf aus `chat` über `admin` nach `assertConversationOwner` – dann entfällt die Warnung.
- **`post-conversation`-Bug** (`voice_id` fehlt im Select, Einträge werden erneut geclustert) – fachlich prüfen und separat beheben.
- **Doku-Aufräumen:** Pfad `f:/…` in CLAUDE.md, veraltete `docs/architecture.md`.
- Krisensignal bei erreichtem Limit: **entschieden** (Krisenantwort wird trotz Limit ausgeliefert).
