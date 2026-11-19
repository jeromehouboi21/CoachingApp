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
