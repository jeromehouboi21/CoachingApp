# Paket K „Konto & Vertrauen“ – Abschlussbericht

**Stand:** 20.11.2026 · **Handoff:** `docs/Neues_Zielbild/handoff-paket-k-konto-vertrauen.md` · **Konzept:** `docs/konto/friedensstifter-konto-vertrauen-konzept-v1.md` · **Bestandsaufnahme:** `docs/konto/paket-k-discovery.md`

Alle vier Wellen sind live und von Jerome abgenommen. Die Rechtstexte laufen als **vorläufige Fassung** mit sichtbarer Kennzeichnung. Die Anwaltsprüfung steht noch aus (Entscheidung Jerome, 20.11.2026).

## 1. Status je Welle

| Welle | Status | Was umgesetzt wurde | Abweichung + Grund |
|---|---|---|---|
| W1 Passwort | live, abgenommen (J-K2) | `/profil/passwort` (aktuelles + neues Passwort, andere Geräte abmelden), „Passwort vergessen?“ → Mail → `/passwort-neu`, Mindestlänge 12 überall (auch Registrierung und Einladung, D-2), Mailvorlagen `recovery.html` und `password_changed.html` | Fehlercode bei falschem aktuellem Passwort: **`current_password_invalid`**, ohne aktuelles Passwort: **`current_password_required`**. Security-Notification „Password changed“: **aktiv**, Ankunft bestätigt. Screens unter `src/screens/account/` statt `src/screens/` (Ordnerstruktur). |
| W2 Sicherheitsseite | live, abgenommen (J-K3) | Öffentliche Seite `/sicherheit` aus `securityMeasures.js` (nur Aussagen mit Beleg, Build-Prüfung), Block „Warum sich die App etwas merkt“ (Wie es funktioniert, Einstieg), Profil gegliedert in Dein Begleiter · Konto & Sicherheit · Rechtliches | Spracheingabe: Browser statt Mistral (später ausgeschaltet, s. W3). Region Irland statt Frankfurt; die Functions wurden dafür nach `eu-west-1` umgezogen (S-09). OpenAI fehlte im Konzept. |
| W3 Einstieg + Einwilligung v2.0 | live **vorläufig** (Status `vorlaeufig`), abgenommen | Einstieg `/start/1–4`, zwei getrennte Häkchen, „Lieber nicht“, Zustimmung nur über den Server (Migration 040), Sperre für Bestandsnutzer mit erneuter Zustimmung, Eingeladene: Zustimmung → Passwort, Zustimmungsprüfung in `chat`/`post-conversation`, Freigabe in drei Stufen, Datenschutzerklärung 2.0, Abgleich Text ↔ Code (CODE-1–9) | Ohne Anwaltsfreigabe live genommen (Jerome, 20.11.2026), mit Kennzeichnung und `LEGAL_REVIEW_OPEN`. Migrationsnummer 040/041 statt 037. Zusätzliche Code-Änderungen, damit die Texte stimmen: Spracheingabe aus, OpenAI nur mit Lernbasis, Reflexionen anonymisiert und geprüft, Lernbasis-Zustimmung v2.0 (E1/E2: Bestand gelöscht). |
| W4 Konto löschen | live, abgenommen (J-K5) | Bestätigungsmail **nach** der Löschung, Text nach Konzept 6.3, Export davor, Fehler sichtbar ohne Abmelden, Löschweg aus `/sicherheit` und der Zustimmungs-Sperre, Ablauf für unvollständige Löschungen | Befund beim Test: Eine im Browser gespeicherte Sitzung eines gelöschten Kontos hing in der Zustimmung fest → Fix: Sitzung wird beendet, `ProfileMissingScreen` für fehlende Profile. Mail ohne Umlaute (Einschränkung des Mailers aus Paket C). |

## 2. Befunde aus Phase 0

Alle Antworten mit Fundstellen: `docs/konto/paket-k-discovery.md`. Die wichtigsten:

- **Passwort:** Es gab kein „Passwort vergessen“ und keine Behandlung von `PASSWORD_RECOVERY`. Der Client läuft im impliziten Flow. Die alte Mindestlänge (8) galt auch bei Registrierung und Einladung.
- **Einwilligung:** Die Zustimmungsfelder schrieb der Client selbst, `handle_new_user` nahm jede Version an, und `checkConsent()` wurde nirgends aufgerufen.
- **Drittanbieter:** OpenAI erhielt die erste Nachricht jedes Gesprächs, unabhängig von der Lernbasis. Die Spracheingabe lief über Google/Apple, nicht über Mistral. Beides war in der Datenschutzerklärung nicht erwähnt.
- **Falsche Aussagen in der Datenschutzerklärung:** Frankfurt statt Irland, „Zero Data Retention“, IP-Speicherung bei der Einwilligung, „Keine Weitergabe an Dritte – niemals“.
- **Löschen:** `experience_patterns.source_user_id` ist `ON DELETE CASCADE`, und der Export war vorhanden. Der Fehlerfall zeigte bisher den rohen Code.

## 3. Belege der Sicherheitsseite

17 Aussagen live, jede mit Beleg (Build-Prüfung `check-content.mjs`). Nicht angezeigt:

| ID | Status | Grund |
|---|---|---|
| R-1 Betreiberzugang | text_offen | Text steht inzwischen in der Vereinbarung; für die Sicherheitsseite nach der Anwaltsprüfung übernehmen |
| R-3 Anthropic, R-3 OpenAI | text_offen | Speicherfristen sind belegt (30 Tage, s. `dpa-auswertung.md` und `legalTexts.js`); Formulierung für die Seite fehlt (Vorschlag in Abschnitt 6) |
| S-11 Spracheingabe | geplant | Spracheingabe aus, bis sie über Mistral (EU) läuft |
| Hinweis „externe Prüfung“ | geplant | erst mit S-21 |

Live seit Paket K neu bzw. geändert: „Passwort geändert → Mail“ (K W1), Region Irland, S-09 Functions in der EU, Belege für S-15 Löschen (Löschtest W4 mit zweitem Faktor, 32× 0, Bestätigungsmail).

## 4. Migrationen und geänderte Dateien

- **Migration 040** `040_k_consent_v2.sql`:
  - `handle_new_user` setzt die Zustimmung nur bei v2.0
  - die vier Zustimmungsspalten im Schutz-Trigger
  - RPC `accept_consent_v2`
- **Migration 041** `041_k_legal_v2_cleanup.sql`:
  - alle `coach_reflections` gelöscht
  - Lernbasis-Zustimmungen unter 2.0 zurückgesetzt, ihre Einträge gelöscht
  - `set_learning_opt_in` nimmt nur noch 2.0
- **Functions:**
  - `chat`: Zustimmungsprüfung, RAG nur mit Lernbasis
  - `post-conversation`: Zustimmungsprüfung, Prüfschritt für Reflexionen, Lernbasis v2.0
  - `delete-account`: Bestätigungsmail
  - `_shared/consent.ts` (neu), `_shared/rag.ts`, `_shared/monitorRules.ts`
- **Frontend neu:**
  - `src/content/` (`legalTexts.js`, `securityMeasures.js`, `whyMemory.js`)
  - `src/screens/account/`, `src/screens/start/`, `src/screens/legal/SecurityInfoScreen.jsx`
  - `src/components/auth/`, `src/components/legal/*`, `src/components/WhyMemoryBlock.jsx`
  - `src/lib/passwordPolicy.js`, `src/lib/passwordRecovery.js`
- **Frontend entfernt:** `src/screens/onboarding/`
- **Build und Tests:**
  - `scripts/security/check-content.mjs` (Sicherheitsseite und Rechtstexte)
  - `attack-test.mjs` (K1–K8, S13-d, S12 stabilisiert)
  - `deletion-test.mjs`
- **Weiteres:**
  - `vite.config.js`: PDFs von der Navigations-Umleitung der PWA ausgenommen
  - Vorlagen `supabase/templates/*`
  - SQL-Vorlagen `supabase/diagnostics/k-legal-ablaeufe.sql`
- **Doku:**
  - `CLAUDE.md`, `ARCHITECTURE.md` (inkl. Dashboard-Einstellungen), `docs/architecture.md`
  - `docs/konto/*`: Abgleich, Abläufe, DPA-Auswertung, Anwaltsunterlagen
  - `docs/DPA/*`

## 5. Tests

- **Angriffstest:** zuletzt grün, nach W3 mit 167 PASS und 0 FAIL, nach W4 von Jerome bestätigt.
  - K1–K3 PASS (W1)
  - K4–K6 PASS
  - K8 PASS: `chat` ohne Zustimmung gibt `403 consent_required`
  - S13-d PASS
  - **K7** (Signup mit `consent_version: '9.9'`): PASS am 20.11.2026 über `npm run security:k7`. Das Profil hatte keine Zustimmung, das Wegwerfkonto wurde wieder gelöscht.
  - S12-b: ein FAIL war ein Zeitproblem im Test (Antwort von S12-a kam verspätet an), behoben.
- **Löschtest:** ohne und mit zweitem Faktor 15 Schritte, 0 FAIL. `deletion-check.sql` zeigt alle 32 Prüfpunkte auf 0, die Bestätigungsmail kam an.
- **Manuell (Jerome):**
  - W1 (a)–(f)
  - Sicherheitsseite, „Wie es funktioniert“, Profil
  - Einstieg mit neuer Adresse, erneute Zustimmung mit eigenem Konto
  - Löschfenster, Löschweg aus `/sicherheit`
  - Sitzung eines gelöschten Kontos → Landing

## 6. Vorschläge für R-2 (zur Freigabe durch Jerome)

Die Datenschutzerklärung ist seit W3 auf Version 2.0 (vorläufig). Noch nicht enthalten:

- **Passwort-Mails:** „Wenn du dein Passwort zurücksetzt oder änderst, schicken wir dir dazu eine E-Mail. Sie enthält nur einen Link bzw. einen Hinweis, keine Inhalte aus deinem Konto. Versendet wird sie über unser E-Mail-Postfach bei one.com.“
- **Löschbestätigung:** „Nach der Löschung deines Kontos bekommst du eine Bestätigung per E-Mail. Deine Adresse wird dafür nur für diesen Versand verwendet und danach nicht gespeichert.“
- **Sicherheitsseite:** „Wie wir deine Daten technisch schützen, steht auf der Seite ‚Wie wir deine Daten schützen‘ (/sicherheit).“
- **R-3 für die Sicherheitsseite:** „Für die Antworten des Begleiters geht der Gesprächsverlauf an Anthropic. Anthropic nutzt ihn nicht zum Training und löscht ihn in der Regel nach 30 Tagen.“ · „Nur wenn die App die Lernbasis nutzt, wird die erste Nachricht eines Gesprächs bei OpenAI in einen Zahlenwert umgerechnet. OpenAI nutzt sie nicht zum Training und löscht sie nach spätestens 30 Tagen.“

## 7. Offene Aufgaben für Jerome

- [x] Dashboard-Einstellungen aus J-K1 gesetzt
- [ ] **Anwaltstermin:** Prüfpunkte R1–R6 (`anwaltstermin-fragen.pdf`, `rechtstexte-v2-entwurf.pdf`). Danach Texte anpassen, Version auf 2.1 (alle stimmen erneut zu), `LEGAL_TEXTS_STATUS = 'freigegeben'`.
- [ ] Anbieterfrist (R-3) auf der Sicherheitsseite: Text aus Abschnitt 6 freigeben. In `legalTexts.js` ist sie bereits eingetragen.
- [ ] Vorschläge aus Abschnitt 6 für die Datenschutzerklärung freigeben
- [ ] Website-Seite „Sicherheit“ (K-7) im Website-Projekt anstoßen
- [x] **K7:** `npm run security:k7` (eigenes Skript, braucht `TEST_K7_EMAIL`), PASS am 20.11.2026
- [ ] Unterauftragnehmer-Listen bei Supabase und Vercel abonnieren (Einspruchsfrist 5 Tage)
- [ ] Prüfen, dass das Absender-Postfach (`ALERT_EMAIL_FROM`) gelesen wird, denn die Löschmail lädt zum Antworten ein
- [ ] `docs/DPA/Supabase DPA.pdf` ist lokal geändert und nicht committet: neue Fassung oder zurücksetzen?
- [ ] Design-Dokument aktualisieren (mit Claude): Abschnitte 7.1 (Onboarding → Einstieg), 7.6 (Profil), 7.6b (Löschen), 7.8 (Wie es funktioniert) und Kreislauf-Konzept Abschnitt 7 („Onboarding bleibt gleich“ gilt nicht mehr)

## 8. Offene Fragen und Beobachtungen

- **Zustimmungsprüfung auf dem Server** gibt es in `chat` und `post-conversation`. Die übrigen Functions (Briefing, Export, Löschen, MFA) prüfen sie bewusst nicht: Export und Löschen müssen ohne Zustimmung erreichbar bleiben, das Briefing liefert nur Eckdaten.
- **Lernbasis** ist leer und `RAG_LEARNING_ENABLED` aus. Erst einschalten, wenn die OpenAI-Frage (R2) geklärt ist.
- **Krisen-Eintrag** wird mit dem Konto gelöscht, obwohl er als Nachweis gedacht ist (Prüfpunkt R4).
- **Wiederholte Nachricht (S12):** Kommt eine Antwort sehr spät an, könnte eine wiederholte Nachricht theoretisch die Antwort auf eine andere Nachricht zurückbekommen. Im normalen Betrieb sendet die App nacheinander. Nur beobachtet.
- **Mailer** kann keine Umlaute (denomailer 1.6.0). Für Nutzer-Mails wäre ein Wechsel oder eine MIME-Kodierung sinnvoll, als eigene Aufgabe.
- **E-Mail-Bestätigung bei der Registrierung ist aus** (Befund K7: `signUp` liefert sofort eine Sitzung). Neue Konten sind damit ohne bestätigte Adresse nutzbar. Ob das so gewollt ist, entscheidet Jerome (Supabase → Authentication → Sign In / Providers → Email → „Confirm email“). Wird sie eingeschaltet, zeigt `/start/4` „Bestätige deine E-Mail“, und `security:k7` nutzt den SQL-Weg.
- `admin-invite-user` leitet weiterhin auf `/onboarding`, das auf `/start/1` weiterleitet. Funktioniert, ließe sich bei Gelegenheit direkt umstellen.
