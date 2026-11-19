# Security-Paket C – Abschlussbericht

Stand 19.11.2026 · Auftrag `docs/security/handoff-security-paket-c.md` · Lösungsdesign `friedensstifter-security-paket-c-design-v2.md` · Bestandsaufnahme `paket-c-discovery.md`

Paket C wurde für den UX-Umbau (T0, U1–U3) nach C-2 unterbrochen und danach fortgesetzt. Alle Wellen liefen nacheinander auf eigenen Branches, jede mit Abnahme durch Jerome.

## 1. Status je Maßnahme

| ID | Status | Was umgesetzt wurde | Abweichung + Grund |
|---|---|---|---|
| S-05 (Code) | erledigt (C-1) | `npm run security:secrets` (gitleaks über die ganze Historie, Ausgabe nur Regel/Datei/Commit), `postbuild`-Prüfung von `dist/` auf Schlüssel und Nicht-anon-JWTs (Build bricht ab, auch auf Vercel), `npm run share:zip` nur aus HEAD mit `export-ignore` | Secret-Scan ohne Fund → keine Rotation nötig (C-7) |
| S-09 | erledigt (C-1) | Alle Function-Aufrufe über `src/lib/functions.js` mit `x-region: eu-central-1`, CORS zentral in `_shared/cors.ts`; Angriffstest #32 prüft `x-sb-edge-region` für `chat`, `pre-session-briefing`, `export-my-data` | – |
| S-22 | erledigt (C-2) | Migration 034 (`app_logs.origin` per Trigger, `security_alerts`, `security_log_counts`), `security-monitor` stündlich (Schwellen mit Cooldown, Lebenszeichen, Wochenübersicht montags), Admin-Tab „Sicherheit“, Notfallplan (freigegeben) | **Mailkanal: SMTP 465 funktioniert** (Alarm-Mails angekommen). Nachtrag: Mails als reines ASCII, weil denomailer Umlaute nicht zuverlässig kodiert. Herkunft `origin` neu gegenüber Design (Befund 7.1 der Discovery: Clients konnten Fehlalarme auslösen) |
| S-11 | erledigt (C-3) | Migration 036: Feedback und Beta-Fragebogen nur mit `consent_given = true` (RLS), `age_confirmed_at` (server-only, Signup-Metadaten bzw. RPC `confirm_age`), `consent_ip` entfernt, `feedback_surveys` mit 24-Monats-Frist; Onboarding-Häkchen 18+, einmaliges Sheet für Bestandsnutzer, Hinweis zur Spracheingabe | `feedback_surveys` bekam zusätzlich eine Einwilligungsspalte (Discovery 7.4, Jerome: ja). Migration 036 statt 035, weil U3 die 035 belegt |
| S-16 | erledigt (C-4) | `export-my-data` (Selbstauskunft, `requireUser`, 3/Tag fail-closed), Tabellenliste `EXPORT_TABLES`, Ausschlussliste mit Begründung, `_erklaerung`, Bestätigungsmail, Profil „Meine Daten herunterladen“ | `invited_by` wird entfernt (ID einer anderen Person). Seit C-5 ist auch `mfa_recovery_codes` im Export (ohne Hash) |
| S-06b | erledigt (C-5) | Migration 037 (`mfa_satisfied()`, restriktive Policy `mfa_required` auf allen Client-Tabellen außer `app_logs`, MFA-Prüfung in `set_learning_opt_in`/`confirm_age`, `mfa_recovery_codes`), `requireUser` mit aal2-Pflicht bei Faktor, Function `mfa-recovery`, Code-Abfrage nach dem Login, Profil-Karte, gemeinsame MFA-Bausteine für Admin und Nutzer | Code-Abfrage sitzt zusätzlich in `App` (nicht nur `ProtectedRoute`), weil `useAuth` kein gemeinsamer Context ist; globaler Fehlerpfad über Sitzungs-Refresh. Migration 037 statt 036 |

## 2. Befunde aus Phase 0 und unterwegs

**Aus Phase 0 (Discovery, Abschnitt 7):**
1. Clients konnten beliebige Log-Codes schreiben → `app_logs.origin` per Trigger, Monitoring zählt nur `server` (Ausnahme `mfa_verify_failed`).
2. Fünf überwachte Codes gab es noch nicht (`rate_limit_db_error`, `delete_incomplete`, `auth_delete_failed`, `message_insert_failed`, `auth_rejected`) → in C-2 ergänzt.
3. `mfa_verify_failed` sieht nur Fehlversuche über die App, nicht direkt gegen die Auth-API → Schutz dort über das Rate-Limit von Supabase Auth; im Notfallplan vermerkt.
4. `feedback_surveys` ohne Einwilligungsspalte → in 036 ergänzt.
5. Feedback-Modal verschwieg Fehler → sichtbarer Hinweis, Logcode ohne Fehlertext.

**Unterwegs:**
6. **`useAuth` ist kein Context** (C-5): Jede Komponente hat eigenen Zustand. Gelöst über ein globales Signal (Sitzung erneuern → `TOKEN_REFRESHED` → jede Instanz prüft neu).
7. **Löschtest seit C-3 fehlerhaft:** Der Feedback-Insert schickte kein `consent_given` und wäre per RLS abgelehnt worden. Korrigiert; neuer Schalter `DELETION_TEST_MFA=1`.
8. **PWA-Falle beim Deploy (C-5):** Der erste Aufruf nach dem Deploy lief mit dem alten Bundle aus dem Service Worker. Die alte App kannte die Code-Abfrage nicht, deutete das leere Profil als „neuer Nutzer“ und zeigte das Onboarding. Der Speicherversuch wurde von der neuen RLS abgelehnt, es entstand kein Schaden. Nach Neuladen korrekt. → In `ARCHITECTURE.md` und `CLAUDE.md` („nach dem Deploy einmal neu laden“) festgehalten; Vorschlag in Abschnitt 7.
9. **`otplib` nicht installiert** (Installation im Werkzeug abgelehnt). Der Angriffstest berechnet TOTP selbst nach RFC 6238 (gegen den offiziellen Testvektor geprüft) – keine neue Abhängigkeit.
10. **Spracheingabe** brach bei Denkpausen ab → `continuous` + stiller Neustart (kein Sicherheitsthema, im Rahmen des C-3-Tests aufgefallen).

## 3. Migrationen und geänderte Dateien

| Migration | Welle | Inhalt |
|---|---|---|
| `034_s22_security_monitoring.sql` | C-2 | `app_logs.origin` + Trigger, `security_alerts`, `security_log_counts()`, Cron `security-monitor`, `purge-security-alerts` |
| (035 = `035_u3_insight_surfacing.sql`, UX-Tranche U3) | – | – |
| `036_s11_privacy_fixes.sql` | C-3 | Einwilligungs-Policies, `age_confirmed_at`, `confirm_age()`, Schutz-Trigger/`handle_new_user` angepasst, `consent_ip` entfernt, `apply_retention` + `feedback_surveys` |
| `037_s06b_user_mfa.sql` | C-5 | `mfa_satisfied()`, Policy `mfa_required` (12 Tabellen), RPCs mit MFA-Prüfung, `mfa_recovery_codes` |

**Neue Functions:** `security-monitor`, `admin-security` (C-2), `export-my-data` (C-4), `mfa-recovery` (C-5).
**Neue/geänderte Shared-Module:** `_shared/cors.ts`, `_shared/mailer.ts`, `_shared/monitorRules.ts`, `_shared/auth.ts` (`requireUser(opts)`, `assertAal2`), `_shared/rateLimit.ts` (`export`, `mfaCodes`, `mfaRecover`).
**Frontend:** `src/lib/functions.js`, `src/lib/mfa.js`, `src/components/mfa/*` (4 Bausteine), `src/screens/auth/MfaChallengeScreen.jsx`, `src/components/profile/SecurityCard.jsx`, `DataExportSheet.jsx`, `src/components/layout/AgeConfirmSheet.jsx`, `src/components/admin/SecurityTab.jsx`; geändert u. a. `useAuth`, `useAdminMfa`, `AdminMfaScreen`, `App.jsx`, `ProfileScreen`, `Step4Auth`, `ChatInput`, `useVoiceInput`, `BetaSurveyScreen`.
**Skripte:** `scripts/security/secret-scan.mjs`, `check-build.mjs`, `scripts/share-zip.mjs`, `attack-test.mjs` (#27–#38), `deletion-test.mjs` (MFA-Schalter), `.gitleaks.toml`, `.gitattributes`.
**Doku:** `ARCHITECTURE.md`, `CLAUDE.md`, `docs/security/notfallplan.md`.

## 4. Tests

| Test | Ergebnis |
|---|---|
| Angriffstest ohne MFA-Lauf | **150 · PASS 148 · FAIL 0 · SKIP 2** (`supervision`, MFA-Lauf) |
| Angriffstest mit `ATTACK_TEST_MFA=1` | **160 · PASS 159 · FAIL 0 · SKIP 1** (`supervision`) – #34 aal1 mit Faktor: Tabelle 0 Zeilen, `chat`/`export-my-data` 403, `confirm_age` 42501 · #35 falscher Code 400 · #36 aal2 liest wieder · #37 Codes → Wiederherstellung → Faktoren 0, Code erneut 400 · #38 aufgeräumt |
| Löschtest mit Faktor (`DELETION_TEST_MFA=1`) | 14 Schritte, FAIL 0 (Faktor + 10 Codes, Export ohne Geheimnisse, Löschung mit aal2); `deletion-check.sql`: **32 Prüfpunkte, alle 0** inkl. `mfa_recovery_codes`, `auth.mfa_factors` |
| Probe-Mail / echte Alarme | Alarm-Mails `auth_rejected`, `userid_mismatch` angekommen (C-2); Mails zu Export und MFA bei Testkonto A angekommen (C-4, C-5). **Offen: echter MFA-Alarm (J-C7)** |
| Manuelle Prüfung | J-C4 (18+, Feedback, Mikrofon-Hinweis, Profil), J-C5 (Export Testkonto A + eigenes Konto), J-C6 (eigenes Konto mit Code-Abfrage, Testkonto A: Einrichten → Code → Wiederherstellung → neu → Entfernen, Mails) – alle bestanden |

**Export-Abdeckung je Tabelle (Personenbezug laut `deletion-check.sql`):**

| Tabelle | Im Export | Hinweis |
|---|---|---|
| `auth.users` | ja (`konto.auth`) | nur E-Mail, Anlage, letzte Anmeldung |
| `auth.mfa_factors` | ja (`konto.zweite_faktoren`) | nur Name, Typ, Status, Datum |
| `profiles` | ja | ohne `invited_by` |
| `mfa_recovery_codes` | ja | ohne `code_hash` |
| `conversations`, `messages` | ja | |
| `insights`, `coach_file_entries`, `coachee_profile`, `user_memory`, `pattern_references`, `inner_voices` | ja | |
| `session_notes`, `resonance_map`, `coach_reflections` | ja | |
| `crisis_events` (inkl. `notes`), `user_feedback`, `feedback_surveys`, `app_logs`, `rate_limit_counters` | ja | |
| `experience_patterns` | ja (`lernbasis`) | ohne `embedding` |
| `conversation_context` | nur „vorhanden“ | enthält Erfahrungen anderer Menschen |
| `supervision_logs`, `security_alerts`, `invite_codes` | nein | ohne Bezug zu einzelnen Personen (`EXCLUDED_TABLES`) |

## 5. Vorschläge für R-2 (Datenschutzerklärung)

Formulierungsvorschläge, keine Rechtsberatung; bitte mit dem Anwalt abstimmen.

- **Region:** „Die Server-Funktionen der App laufen in Rechenzentren unseres Hosters Supabase in Frankfurt am Main (EU). Auch deine Daten werden dort gespeichert.“
- **Altersgrenze:** „Friedensstifter richtet sich an Erwachsene. Bei der Registrierung bestätigst du, dass du mindestens 18 Jahre alt bist; wir speichern den Zeitpunkt dieser Bestätigung.“
- **Spracheingabe:** „Wenn du die Spracheingabe nutzt, verwendet die App die Spracherkennung deines Browsers. Dabei kann das Gesagte an den Anbieter des Browsers (z. B. Google bei Chrome, Apple bei Safari) übertragen und dort in Text umgewandelt werden. Wir erhalten nur den Text, den du anschließend selbst abschickst. Die Spracheingabe ist freiwillig.“
- **Feedback:** „Feedback und Antworten aus dem Beta-Fragebogen speichern wir nur mit deiner ausdrücklichen Einwilligung, zusammen mit deinem Namen, und löschen sie nach 24 Monaten. Du kannst die Einwilligung jederzeit widerrufen.“
- **Datenexport:** „Im Profil kannst du unter ‚Meine Daten herunterladen‘ jederzeit eine Datei mit allen Daten erstellen, die wir über dich gespeichert haben, einschließlich der Notizen, die der Coach im Hintergrund führt (Art. 15 und 20 DSGVO). Wir schicken dir dazu eine Bestätigung per E-Mail.“
- **Zweiter Faktor:** „Du kannst dein Konto freiwillig mit einem zweiten Faktor (Code aus einer Authenticator-App) schützen. Wir speichern dazu den Faktor bei Supabase sowie verschlüsselte Prüfwerte deiner Wiederherstellungscodes, nie die Codes selbst. Über Einrichten, Entfernen und die Nutzung eines Wiederherstellungscodes informieren wir dich per E-Mail.“
- **Mail-Absender / Auftragsverarbeiter:** „E-Mails der App (Anmeldung, Bestätigungen zu Export und zweitem Faktor) versenden wir über den Mailserver von one.com (Absender hallo@friedensstifter.coach). Diese Mails enthalten keine Inhalte aus deinen Gesprächen.“
- **Sicherheitsprotokolle:** „Zur Abwehr von Missbrauch protokollieren wir technische Ereignisse (z. B. abgelehnte Anmeldungen) ohne Inhalte für 30 Tage.“

## 6. Offene Aufgaben für Jerome

- [x] Gefundene Secrets rotiert – entfällt, Secret-Scan ohne Fund
- [x] Notfallplan freigegeben – **offline ablegen/ausdrucken** noch bestätigen
- [ ] `MFA_CODE_PEPPER` offline gesichert (ohne ihn sind alle Wiederherstellungscodes wertlos)
- [ ] Eigene Wiederherstellungscodes sicher abgelegt
- [ ] One.com als Auftragsverarbeiter für Alarm- und Kontomails in R-3 aufnehmen (AV-Vertrag)
- [ ] DatenschutzScreen nach Abschnitt 5 aktualisieren (R-2): Altersgrenze, Spracheingabe, Feedback-Einwilligung/24 Monate, Export, zweiter Faktor, Mail-Absender
- [ ] J-C7: echten Alarm auslösen (6× falscher Code mit Testkonto A → nach dem nächsten Monitor-Lauf Alarm `mfa_verify_failed`)
- [ ] Supabase CLI-Update auf 3.x mit Probe-Deploy (während Paket C bewusst auf 2.95.4)

## 7. Offene Fragen und Beobachtungen

1. **Automatisches Neuladen bei neuer App-Version?** Mit `autoUpdate` gilt eine neue Version erst beim zweiten Aufruf (Befund 2.8). Vorschlag für eine spätere Tranche: Sobald der neue Service Worker aktiv ist, lädt die App einmal neu (oder zeigt „Neue Version – tippen zum Laden“). Betrifft vor allem Deploys mit gleichzeitigen RLS-Änderungen.
2. **`consume_session` ohne MFA-Prüfung:** Die RPC ist für `authenticated` ausführbar und prüft `mfa_satisfied()` nicht. Ein aal1-Token mit Faktor könnte damit höchstens das eigene Gesprächskontingent zählen lassen (kein Datenzugriff). Der Handoff schließt das bewusst aus, weil `chat` über `requireUser` geschützt ist. Bei Gelegenheit die Prüfung ergänzen oder das Ausführungsrecht auf `service_role` beschränken (dann ruft `chat` sie über `admin` mit expliziter Nutzer-ID).
3. **Sitzungen auf anderen Geräten:** Beim Bestätigen eines neuen Faktors beendet Supabase die übrigen aal1-Sitzungen des Kontos. Das ist gewollt, sollte aber in „Wie es funktioniert“ oder im Einrichten-Text erwähnt werden, falls Nutzer sich wundern.
4. **Admin-Erlebnis:** Seit C-5 fragt die App Admins direkt nach der Anmeldung nach dem Code (nicht erst im Admin-Bereich). Die Admin-Code-Abfrage in `AdminRoute` bleibt als Fallback.
