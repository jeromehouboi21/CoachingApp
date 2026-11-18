# E-Mail-Vorlagen (Supabase Auth)

Diese Dateien sind die Quelle für die Vorlagen im Supabase-Dashboard
(*Authentication → Emails → Templates*). Sie werden **nicht** automatisch übertragen:
Inhalt kopieren und im Dashboard einfügen.

| Datei | Dashboard-Vorlage | Betreff |
|---|---|---|
| `invite.html` | Invite user | Deine Einladung zu Friedensstifter |
| `confirmation.html` | Confirm signup | Bitte bestätige deine E-Mail-Adresse |
| `magic_link.html` | Magic Link | Dein Anmelde-Link für Friedensstifter |
| `recovery.html` | Reset Password | Neues Passwort für Friedensstifter |

Platzhalter: `{{ .ConfirmationURL }}` (enthält Token und Weiterleitung). Sprachprinzip beachten.
