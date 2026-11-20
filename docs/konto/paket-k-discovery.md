# Paket K – Bestandsaufnahme (Phase 0)

Stand 19.11.2026 · Basis `main` nach U5a (`79fe86c4` + Doku) · Teil 2.1 (W1); W2-Fragen 6–10 folgen zu Beginn von W2.

## Vorab: Abweichungen, die vor dem Bau geklärt werden

| # | Befund | Folge |
|---|---|---|
| D-1 | Das Konzept `friedensstifter-konto-vertrauen-konzept-v1.md` liegt **nicht** im Projekt (nur der Handoff, in `docs/Neues_Zielbild/`, uneingecheckt). Laut Handoff stehen dort Texte und Layout für „Passwort ändern“ (Konzept 5.2 A). | Jerome legt es nach `docs/konto/` (J-K1, Punkt 1). Ohne Konzept baue ich W1 nur mit den Texten aus dem Handoff (Fehlertexte, Erfolgstext, „Passwort vergessen“-Text) und einem schlichten Layout. |
| D-2 | **Mindestlänge 12 im Dashboard trifft auch Registrierung und Einladung.** `Step4Auth` prüft keine Länge (Supabase-Standard 6), `InvitedSetPassword` verlangt `minLength={6}`, der Login-Platzhalter sagt „Mindestens 8 Zeichen“. Mit Mindestlänge 12 im Dashboard scheitern Registrierung und Einladung bei 6–11 Zeichen mit einer englischen Fehlermeldung (`err.message` wird roh angezeigt). | Vorschlag: W1 setzt `passwordPolicy` (12 Zeichen, deutsche Texte) auch in `Step4Auth` und `InvitedSetPassword` ein und korrigiert den Platzhalter. Kleiner, notwendiger Zusatz zu W1. |
| D-3 | **„Require current password when updating“ trifft den Einladungsweg.** `InvitedSetPassword.jsx:29` setzt das erste Passwort mit `updateUser({ password })` ohne aktuelles Passwort (es gibt keins). Gleiches gilt für `/passwort-neu` (Recovery). Ob Supabase in diesen Fällen trotzdem durchlässt (Konto ohne Passwort bzw. Recovery-Sitzung), ist nicht dokumentiert. | Nach dem Umschalten im Dashboard **beides testen**: Einladung mit Testadresse und „Passwort vergessen“. Scheitert die Einladung, bleibt die Einstellung aus, und Weg A prüft das aktuelle Passwort stattdessen per `reauthenticate`/Anmeldung (Entscheidung dann mit dir). |

## 2.1 Antworten für W1

| Frage | Befund (Datei:Zeile) |
|---|---|
| 1 „Passwort vergessen“ auf dem Login | **Gibt es nicht.** `src/screens/landing/AuthScreen.jsx:106–160`: E-Mail + Passwort, „Link per E-Mail – kein Passwort nötig“ (Magic Link, `sendMagicLink`, nur bestehende Konten), Datenschutz-Link, „Neu hier? → /onboarding“. Kein `resetPasswordForEmail` im ganzen Frontend. |
| 2 Route für neues Passwort / `PASSWORD_RECOVERY` | **Gibt es nicht.** `useAuth` (`src/hooks/useAuth.js`) behandelt alle Auth-Ereignisse gleich (`applySession`, seit C-5 mit `setTimeout`); `PASSWORD_RECOVERY` wird nicht ausgewertet. `useAuth` selbst leitet nicht weiter; Weiterleitungen machen die Routen (`/landing`, `/auth` → `/home` bei Anmeldung). Eine neue öffentliche Route `/passwort-neu` würde also nicht automatisch weggeleitet. |
| 3 Auth-Flow | `src/lib/supabase.js`: `createClient(url, anonKey)` ohne Optionen → supabase-js 2.99.2 Standard **`flowType: 'implicit'`**, `detectSessionInUrl` an. Recovery-Link → Token im URL-Fragment → Ereignis `PASSWORD_RECOVERY`. Kein `exchangeCodeForSession` im Code. Magic Link läuft ebenso implizit. |
| 4 „Passwort ändern“ im Profil | **Gibt es nicht.** Einzige Stelle mit `updateUser({ password })`: `src/screens/onboarding/InvitedSetPassword.jsx:29` (erstes Passwort bei Einladung, Mindestlänge 6). |
| 5 Eingeloggt auf öffentlicher Route | `src/App.jsx`: `/impressum`, `/datenschutz` sind ohne Prüfung erreichbar; `/landing`, `/auth` leiten Angemeldete nach `/home`; unbekannte Routen → `/home` bzw. `/landing`. Seit C-5: Bei `mfaGate = 'required'` zeigt `App` für **alle** Routen außer `/impressum`, `/datenschutz` die Code-Abfrage → `/passwort-neu` liegt damit automatisch hinter der Code-Abfrage (Handoff 3.3, „Ab C-5“). |

**Weitere Hinweise für W1**
- Migrationsnummer: W1 braucht keine. Nächste freie Nummer für W3 ist **040** (nicht 037 wie im Handoff erwartet; 037–039 sind durch C-5, U4, U5a belegt). Neueste Fassung des Schutz-Triggers: **038** (nicht 035).
- `monitorRules.ts` existiert (C-2) → neue Log-Codes (`password_change_failed`, `password_changed`, `password_reset_request_failed`, `signout_others_failed`) kommen dort als `infoOnly` hinein.
- Profil: Einträge heute (U4/C-5-Stand): Profil bearbeiten · Wie es funktioniert · Begleitung · Beta-Feedback/-Fragebogen · Coaching-Vereinbarung · Datenschutzerklärung · Meine Daten herunterladen · Impressum · Abmelden · Konto löschen; darüber die Karten „Zur Lernbasis beitragen“ und „Konto zusätzlich schützen“. „Passwort“ kommt bis W2 direkt über „Datenschutzerklärung“ (Handoff 3.5).
- Kein Analyse-/Tracking-/Fehlerdienst im Frontend gefunden (Vorgriff auf Frage 7).

## W1 – Bauhinweise (20.11.2026)

- Entscheidungen K-1 … K-8 nach Empfehlung, D-2 freigegeben. Konzept-Datei fehlt weiterhin → Texte aus dem Handoff, schlichtes Layout.
- Neue Dateien: `src/lib/passwordPolicy.js`, `src/lib/passwordRecovery.js` (liest das URL-Fragment beim Laden, bevor der Supabase-Client es verarbeitet; Merker in `sessionStorage`; in `main.jsx` als erster Import), `src/components/auth/PasswordField.jsx`, `src/components/auth/ForgotPasswordForm.jsx`, `src/screens/account/PasswordChangeScreen.jsx` (`/profil/passwort`), `src/screens/account/PasswordResetScreen.jsx` (`/passwort-neu`). Abweichung: Screens liegen unter `src/screens/account/` statt direkt in `src/screens/` (Ordnerstruktur der App).
- Login: „Passwort vergessen?“ unter dem Passwortfeld (Modus `forgot`), Platzhalter „Dein Passwort“ statt „Mindestens 8 Zeichen“.
- D-2: `Step4Auth` und `InvitedSetPassword` prüfen 12 Zeichen mit deutschen Texten; Fehler beim ersten Passwort einer Einladung werden als Code geloggt (`invite_password_failed`, D-3) und deutsch angezeigt.
- Profil: Eintrag „Passwort“ direkt über „Datenschutzerklärung“.
- `mapAuthError`: `invalid_credentials`, `reauthentication_needed`, `reauthentication_not_valid` und Codes mit „current_password“ → „Das aktuelle Passwort stimmt nicht.“ Den tatsächlichen Code beim Test mit Testkonto A notieren.
- Log-Codes (Frontend, `monitorRules.ts` infoOnly, origin client): `password_changed`, `password_reset_done`, `password_change_failed`, `password_reset_failed`, `invite_password_failed`, `password_reset_request_failed`, `signout_others_failed`.
- Angriffstest K1–K3 (`testsK`): B bekommt sein Passwort sofort zurück, falls K1/K2 wider Erwarten durchgehen. K3 schickt pro Lauf eine echte Reset-Mail an Testkonto B.

## W1 – Abnahme (20.11.2026)

- Dashboard (J-K1) gesetzt: Mindestlänge 12, „Require current password when updating“ an, Redirect-URL `/passwort-neu`, Vorlagen „Reset password“ (`supabase/templates/recovery.html`) und „Password changed“ (`password_changed.html`).
- J-K2 von Jerome bestätigt: (a) Passwort ändern inkl. Fehler bei falschem aktuellem Passwort, Abmelden anderer Geräte, Mail · (b) Passwort vergessen → Link → neues Passwort · (c) zweiter Klick auf denselben Link → „abgelaufen“ · (d) Fantasie-Adresse → gleicher Text · (f) Angriffstest K1–K3 PASS.
- **D-3 geklärt:** Die Einladung (erstes Passwort ohne aktuelles Passwort) funktioniert auch mit „Require current password“ (e).

## 2.1 Antworten für W2 (20.11.2026)

| Frage | Befund |
|---|---|
| 6 Belege | Je Aussage in `src/content/securityMeasures.js` (Feld `evidence`). Seit Paket C abgeschlossen sind S-09, S-06b, S-22, S-16 **live** (im Konzept noch „geplant“); „Passwort geändert → Mail“ live nach J-K2 (a). |
| 7 Tracking | Kein Analyse-, Tracking- oder Fehlerdienst im Frontend (`package.json`, `src/`); CSP nur `self` + Supabase (`vercel.json`); Schriften lokal (`@fontsource`). → „Keine Werbung, kein Tracking …“ live. |
| 8 Drittanbieter mit Inhalten | **Anthropic** (Antworten, `chat`) · **OpenAI** (Embeddings der ersten Nachricht für RAG und der Lernbasis-Einträge, `_shared/rag.ts`, `post-conversation`, sofern der Schlüssel gesetzt ist) · **Browser-Spracherkennung** (Google/Apple) bei der Spracheingabe. Kein Mistral. |
| 9 „Wie es funktioniert“ | `src/screens/howto/HowItWorksScreen.jsx`, Block 3 „Dein Raum gehört dir“ mit vier Punkten, u. a. „Keine Weitergabe an Dritte — niemals“. |
| 10 Profil | Profil hinter dem Avatar ist seit U1 umgesetzt. Einträge vor W2: siehe W1-Abschnitt; Karten Lernbasis und „Konto zusätzlich schützen“ standen lose über der Liste. |

## W2 – Abweichungen vom Konzept (zur Bestätigung in J-K3)

| # | Befund | Umsetzung |
|---|---|---|
| W2-1 | Konzept nennt für die Spracheingabe **Mistral (EU)**. Tatsächlich nutzt die App die **Spracherkennung des Browsers** (Web Speech API; Hinweis aus S-11/C-3). | Eintrag „Spracheingabe“ mit dem zutreffenden Text, live (Beleg `useVoiceInput`, Hinweis im Chat). |
| W2-2 | **OpenAI** bekommt Inhalte (Embeddings), steht nicht im Konzept. | Eigener Eintrag „R-3 OpenAI“, `text_offen` bis R-3 (Speicherfrist, AV-Vertrag). Bitte prüfen, ob der OpenAI-Schlüssel in den Supabase-Secrets gesetzt ist. |
| W2-3 | **Region der Datenbank** lässt sich im Code nicht belegen (nur die Functions, S-09). | Eintrag „Deine Daten liegen … Frankfurt“ `text_offen`, bis Jerome die Projekt-Region im Dashboard bestätigt (Project Settings → General). |
| W2-4 | **„Keine Weitergabe an Dritte — niemals“** in „Wie es funktioniert“ widerspricht W2-2 und der Anthropic-Nutzung (außerdem absolutes „niemals“). Ebenso „Deine Gespräche werden nur für dich gespeichert“. | Block 3 durch „Warum sich die App etwas merkt“ ersetzt (Handoff 4.3 erlaubt Ersatz). Gleiche Formulierungen stehen noch in `LandingScreen`, `AuthScreen` (Text + Datenschutz-Modal) und `Step4Auth` → **Beobachtung**, gehört zu W3 (neuer Einstieg) bzw. R-2. |
| W2-5 | Konzept 3.3: „Deine Einschätzungen – der Begleiter lernt, was dir hilft“ gilt erst mit U5b. | Zeile ehrlich ohne Lern-Aussage („deine eigene Einordnung deiner Erkenntnisse“); mit U5b anpassen. |
| W2-6 | Fristen-Aussage (S-15) braucht Jeromes Formulierung. | `text_offen` mit Vorschlag aus `apply_retention` (Migration 036). |
| W2-7 | Die Belege werden mit ins Frontend gebaut; ein Beleg nannte den Namen einer geheimen Umgebungsvariable → `check-build` brach ab (richtig). | Beleg umformuliert. Belege enthalten nur Dateipfade und Roadmap-IDs, keine Werte. |

## W2 – Bauhinweise

- Neue Dateien: `src/content/securityMeasures.js`, `src/content/whyMemory.js` (`EXPORT_AVAILABLE = true`, C-4 live), `src/screens/legal/SecurityInfoScreen.jsx` (Seite + `SecurityInfoSheet`), `src/components/WhyMemoryBlock.jsx`, `scripts/security/check-content.mjs` (im `postbuild` nach `check-build.mjs`).
- Route `/sicherheit` öffentlich, auch für Angemeldete und auch während der Code-Abfrage (wie Impressum/Datenschutz).
- „Wie es funktioniert“: Block 3 ersetzt durch `WhyMemoryBlock` (+ Links „Was genau gespeichert wird ›“, „Wie wir deine Daten schützen ›“, „Datenschutzerklärung lesen →“).
- Datenschutzerklärung: nur Link „Wie wir deine Daten schützen ›“ unten, keine Textänderung.
- Profil: Abschnitte „Dein Begleiter“ (inkl. Lernbasis-Karte), „Konto & Sicherheit“ (Passwort ändern, Wie wir deine Daten schützen, Meine Daten herunterladen, Karte „Konto zusätzlich schützen“), „Rechtliches“, Abmelden, Trennlinie, Konto löschen. Alle Funktionen existieren (keine Feature-Konstante nötig).
- Angezeigt: 16 Aussagen live; `text_offen`: R-1, Region, R-3 Anthropic, R-3 OpenAI, S-15 Fristen; „Was du wissen solltest“: 2 von 3 (S-21 geplant).

## W2 – Befund Region (20.11.2026)

- Supabase-Projekt-Region laut Dashboard: **`eu-west-1` (West EU, Ireland)** – nicht Frankfurt.
- Die Edge Functions sind seit C-1 (S-09) fest auf **`eu-central-1` (Frankfurt)** gesetzt (`src/lib/functions.js`, Angriffstest #32). Jede Datenbankabfrage einer Function geht damit Frankfurt ↔ Irland (zusätzliche Laufzeit je Abfrage).
- Sicherheitsseite angepasst: „Deine Daten liegen in einem Rechenzentrum in Irland, also innerhalb der EU.“ (live); S-09: „… laufen in der EU.“
- R-2-Vorschlag im Paket-C-Abschlussbericht korrigiert (Frankfurt-Satz war falsch).
- **Offen (Entscheidung Jerome):** Function-Region auf `eu-west-1` umstellen, damit Functions neben der Datenbank laufen.

## W2 – Befund Drittanbieter (20.11.2026)

- **OpenAI-Schlüssel ist gesetzt** (Supabase-Secrets, von Jerome per Screenshot bestätigt, nur Prüfsummen sichtbar). Damit gehen die erste Nachricht jedes Gesprächs (RAG-Suche) und – mit Opt-in – die geprüften Lernbasis-Einträge zur Vektorberechnung an OpenAI.
- **Die Datenschutzerklärung nennt OpenAI nicht** (`DatenschutzScreen.jsx` erwähnt nur Anthropic). → Für R-2/R-3: OpenAI als Empfänger bzw. Auftragsverarbeiter aufnehmen (Zweck, Rechtsgrundlage, Speicherfrist laut Vertrag). Die Sicherheitsseite zeigt den OpenAI-Satz erst danach (`text_offen`).
- **Widersprüchliche Aussagen zu Anthropic:** `DatenschutzScreen.jsx:107` sagt „Es gilt die Zero Data Retention Policy von Anthropic“, das Löschmodal im Profil (`ProfileScreen.jsx`) sagt „Deine Daten bei Anthropic (API-Logs) werden nach 30 Tagen automatisch von Anthropic gelöscht“. Zero Data Retention gilt bei Anthropic nur mit einer ausdrücklichen Vereinbarung. → Für R-3 klären, welche Aussage für den eigenen Vertrag stimmt; danach beide Stellen und den Anthropic-Satz der Sicherheitsseite einheitlich fassen. Keine Textänderung durch Claude Code (Handoff, Spielregel 4).

## 2.2 Antworten für W3 (20.11.2026)

| Frage | Befund (Datei:Zeile) |
|---|---|
| 11 Onboarding | `src/screens/onboarding/OnboardingFlow.jsx`: Steps 1 Welcome · 2 Bereichswahl (`onboarding_data.area`) · 3 Reveal · 3b Vereinbarung · 4 `Step4Auth` (Konto, Häkchen Datenschutz + Art. 9 + 18+, Einladungscode eingeklappt, Login/Magic-Link-Umschalter). Zustand nur im React-State. Eingeladene (`user.invited_at`) sehen Vereinbarung + `InvitedSetPassword`; eingeloggte Nutzer ohne gültige Vereinbarung sehen nur die Vereinbarung. Einstiege: `LandingScreen.jsx:75`, `AuthScreen.jsx:170` (→ `/onboarding`), Einladungs-Link `admin-invite-user` → `redirectTo …/onboarding`. |
| 12 `handle_new_user` | Fassung aus **036**: liest `consent_version`, `coaching_agreement_version` (beliebiger Text bis 20 Zeichen!), `age_confirmed`, `display_name`, `onboarding_*`. Zeitstempel setzt der Server. **Die vier Zustimmungsspalten stehen nicht im Schutz-Trigger** und werden heute vom Client geschrieben: `OnboardingFlow.acceptAgreement` (Vereinbarung) und `InvitedSetPassword` (Einwilligung + Vereinbarung) per `updateProfile`. |
| 13 `checkConsent()` | In `useAuth` vorhanden, **nirgends aufgerufen**. Gesperrt wird nur über `checkCoachingAgreement` (`App.jsx` `ProtectedRoute` → `/onboarding`), Versionen `'1.0'` in `useAuth.js:8–9`. |
| 14–16 | Für W4 (Konto löschen) – folgt dort. |

## W3 – Abweichungen und Bauentscheidungen

- **W3-1 Eigener Branch bis zur Freigabe:** Die Build-Sperre (5.4) würde auf `main` jeden Produktions-Deploy blockieren, und Migration 040 (nur noch Version 2.0) passt nicht zur heutigen App (sendet 1.0). → W3 bleibt auf `konto/paket-k-w3` (Vercel-Vorschau), Merge + `db push` erst nach J-K4.
- **W3-2 Eingeladene:** Handoff deckt sie nicht ab. → Einladungs-Link führt in den neuen Einstieg ab Screen 3 (Zustimmung über RPC `accept_consent_v2`), danach Passwort festlegen; kein Client-Schreiben der Zustimmungsfelder mehr.
- **W3-3 Bereichswahl entfällt:** Step 2 (Bereich) gibt es im neuen Einstieg nicht mehr; `onboarding_data` wird nicht mehr gesetzt (wird nur im Profil gespeichert, nirgends ausgewertet – zu prüfen beim Bau).
- **W3-4 Migrationsnummer 040**, Schutz-Trigger-Vorlage 038.
- **W3-3 geprüft:** `onboarding_data` wird im Frontend und in den Edge Functions nirgends gelesen. `handle_new_user` (040) schreibt die Spalte nicht mehr; Bestandswerte bleiben unverändert stehen.
- **W3-5 Eingeladene, Reihenfolge:** Zustimmung (Screen 3, nur im Zustand) → Passwort festlegen → `accept_consent_v2`. So entsteht keine Zustimmung ohne Passwort. Scheitert nur die RPC, wiederholt „Nochmal versuchen“ nur sie. Als „eingeladen und neu“ gilt: `invited_at` gesetzt **und** noch keine Zustimmung (`missing`). Eingeladene mit Zustimmung 1.0 bekommen die normale erneute Zustimmung, kein zweites Passwort.
- **W3-6 Sperre in `App.jsx`:** Angemeldet ohne Zustimmung v2.0 → `ConsentGateScreen` vor allen Routen (nach der Code-Abfrage), wie die MFA-Sperre. Erreichbar bleiben `/impressum`, `/datenschutz`, `/sicherheit`, `/passwort-neu` und `/profile` (Export, Konto löschen). 18+ kommt im selben Screen vor der Zustimmung (Reihenfolge 5.5). `ProtectedRoute` zeigt ohne gültige Zustimmung nur noch den Ladezustand (zweite Linie).
- **W3-7 Kein Aufblitzen:** `useAuth` kennt jetzt `profileReady` (Profil für genau diesen Nutzer geladen). Erst dann entscheidet `App.jsx` über die Sperre; Token-Erneuerungen ändern daran nichts.
- **W3-8 Screen 4 ohne Anmelden/Magic Link:** Anmelden liegt auf Screen 1 (→ `/auth`). Ohne Sitzung nach der Registrierung (E-Mail-Bestätigung an) zeigt Screen 4 „Bestätige deine E-Mail“ statt wie bisher still auf `/landing` zu landen.
- **W3-9 `accept_consent_v2`** setzt zusätzlich `onboarding_completed = true` (früher vom Client gesetzt) und meldet `profile_not_found`, wenn keine Zeile betroffen ist (kein stilles Scheitern).
- **W3-10 K5 ohne Zurücksetzen:** Der Angriffstest hat bewusst keine service_role. B bleibt nach K5 auf v2.0, was ohnehin der Zielzustand nach dem Deploy ist. K7 (Signup mit `consent_version: '9.9'`) läuft manuell bei J-K4.

## W3 – Beobachtungen (nicht gebaut)

- **Zustimmung nur im Frontend durchgesetzt:** `chat` und die anderen Functions prüfen die Zustimmung nicht. Wer die App-Sperre umgeht, könnte mit Version 1.0 weiter Gespräche führen. Ein Server-Check wäre eine eigene Tranche.
- **„Keine Weitergabe an Dritte – niemals“** steht noch auf `LandingScreen` und `AuthScreen` (R-2, Jerome). Der alte Satz in `Step4Auth` ist mit dem Screen entfallen.
- **Vereinbarung v2.0 = Entwurf aus v1.0** mit zwei `[Prüfen: …]`-Stellen (Betreiberzugang, Anthropic/OpenAI als Auftragsverarbeiter). Die Build-Sperre lässt keinen Produktions-Build mit `[` zu, sobald `LEGAL_TEXTS_APPROVED = true` ist.
- **Links im „Lieber nicht“-Sheet** zeigen vorläufig alle auf `https://friedensstifter.coach/`; Buch- und Kontaktseite trägt Jerome ein.
- `admin-invite-user` leitet weiter auf `/onboarding`; das bleibt als Weiterleitung bestehen, ein Function-Deploy ist dafür nicht nötig.
- `docs/architecture.md:41` nennt noch `src/screens/onboarding/` – Update mit der Doku nach Verifikation.

## 2.3 Antworten für W4 (20.11.2026)

| Frage | Befund |
|---|---|
| 14 Konto löschen | Modal direkt in `ProfileScreen.jsx` (kein eigenes Bauteil). `handleDeleteAccount` zeigte bei Fehlern den rohen Code (z. B. `delete_incomplete`) und ging bei `403 mfa_required` nicht über den globalen Pfad. Function `delete-account`: Gespräche (IDs) → Nachrichten → 8 Tabellen per `user_id` → Gespräche → Profil → bei Fehlern `delete_incomplete` (500, Auth-Konto bleibt) → `auth.admin.deleteUser` → `auth_delete_failed`. Beide Codes sind in `monitorRules.ts` mit Schwelle 1. Weitere Tabellen hängen per CASCADE an `auth.users` bzw. `conversations` (u. a. `experience_patterns`, `crisis_events`, `coach_reflections`, `mfa_recovery_codes`). |
| 15 `experience_patterns.source_user_id` | `ON DELETE CASCADE` (Migration 032, Zeile 17). Die Zeile „deine Beiträge zur Lernbasis, falls du sie erlaubt hast“ gilt. |
| 16 Export | gemergt (C-4). `DataExportSheet({ onClose })` in `src/components/profile/`. |

## W4 – Bauentscheidungen

- **W4-1 Mail nach der Löschung** (Handoff 6.1): Adresse nur im Speicher, Versand über `_shared/mailer.ts` (One.com). Logs nur `account_deleted_mail_ok` / `account_deleted_mail_failed` mit Code, ohne Nutzer-ID. Der Mailer wandelt Umlaute in ASCII um (denomailer 1.6.0) – die Mail lautet also „geloescht“. Bekannte Einschränkung aus Paket C.
- **W4-2 `AI_PROVIDER_RETENTION_NOTE`** in `legalTexts.js` mit dem am 20.11.2026 freigegebenen und belegten Satz (statt Leerstelle).
- **W4-3 Netzfehler** (keine Antwort vom Server) bekommt einen eigenen Hinweis („Die Verbindung ist abgebrochen …“), weil unklar ist, ob die Löschung lief. Alle anderen Antworten ≠ 200 zeigen den Text aus Handoff 6.2. Abgemeldet wird nur bei Erfolg.
- **W4-4 Erreichbarkeit:** `/sicherheit` zeigt in der Gruppe „Was mit deinen Daten passiert, wenn du gehst“ für Angemeldete „Konto löschen ›“ (Sitzung lokal geprüft, kein Datenbankaufruf). Die Zustimmungs-Sperre (W3) öffnet das Modal direkt (`state.openDelete`).
- **W4-5 Wertungsfarbe:** Die Überschrift im Modal ist nicht mehr korallenrot (Zielbild: keine Wertungsfarben); der Lösch-Button bleibt als Warnfarbe.
- **W4-6 Ablauf** für unvollständige Löschungen in `ablaeufe-rechte.md` Abschnitt 6, weil der Fehlertext eine Mail verspricht.

