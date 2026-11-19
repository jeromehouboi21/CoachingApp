# Notfallplan Friedensstifter

> **Ausgedruckt oder offline griffbereit halten.** Im Ernstfall sind App, Laptop oder Konten vielleicht nicht erreichbar.
> Stand: 19.11.2026 (Security-Paket C, Welle C-2) · **Freigabe durch Jerome:** ☑ am 19.11.2026
> Verantwortlich und einzige handelnde Person: Jerome (Betreiber und Verantwortlicher im Sinne der DSGVO).

## 0. Erst einmal

1. **Ruhe bewahren, nichts löschen.** Logs und Alarme sind Beweismittel.
2. **Vorfallsprotokoll anlegen** (Vorlage in Abschnitt 8) und ab jetzt jeden Schritt mit Uhrzeit notieren.
3. **Uhr für die 72-Stunden-Frist starten**, sobald ein Datenabfluss möglich erscheint (Szenario 3).
4. Szenario wählen. Mehrere können gleichzeitig zutreffen; dann zuerst 1 (Schlüssel) und 2 (Admin-Konto).

### Welcher Alarm gehört zu welchem Szenario?

| Alarm (Mail / Admin-Tab „Sicherheit“) | Bedeutung | Szenario |
|---|---|---|
| `userid_mismatch` | Jemand schickt fremde Nutzer-IDs | 3 (prüfen), meist Angriffstest |
| `auth_rejected` | Viele abgelehnte Anfragen (401/403) | 3 oder 4; **der Angriffstest löst ihn absichtlich aus** |
| `admin_mfa_required` | Admin-Zugriff ohne zweiten Faktor | 2 |
| `mfa_verify_failed` / `mfa_recovery_failed` | Codes werden geraten | 2 (bei dir) bzw. Konto des Nutzers |
| `mfa_recovery_used` | Ein Wiederherstellungscode wurde eingesetzt | 2, falls du es nicht warst |
| `rate_limit_db_error` | Rate-Limits sind gerade wirkungslos | 4 |
| `export_burst` | Viele Datenexporte in kurzer Zeit | 3 |
| `assistant_insert_failed` / `message_insert_failed` | Gespräche gehen verloren | Betriebsstörung (Abschnitt 7) |
| `delete_incomplete` | Kontolöschung bricht ab | Betriebsstörung, Löschpflicht (Abschnitt 7) |
| `learning_review_failed` / `supervision_rejected` | Prüfschritt fällt aus bzw. verwirft | Betriebsstörung (Abschnitt 7) |
| `retention_missing` / `supervision_missing` | Cron-Job ist nicht gelaufen | Betriebsstörung (Abschnitt 7) |
| Admin-Tab: „Letzter Monitor-Lauf … überfällig“ | Das Monitoring selbst läuft nicht | Betriebsstörung (Abschnitt 7) |

> **Grenze des Monitorings:** `mfa_verify_failed` sieht nur Fehlversuche über die App-Oberfläche. Wer Codes direkt gegen die Supabase-Auth-API rät, taucht dort nicht auf; dagegen schützt das Rate-Limit von Supabase Auth (Dashboard → Authentication → Rate Limits).

---

## Szenario 1: Schlüssel geleakt

**Erkennen:** Schlüssel in einem Chat, Screenshot, ZIP, öffentlichen Repo oder Log gesehen; Treffer von `npm run security:secrets` oder der Build-Prüfung; ungewöhnliche Kosten bei Anthropic oder OpenAI; ungewöhnliche Mails aus dem Postfach.

**Sofortmaßnahmen** (nur den betroffenen Schlüssel; im Zweifel alle):

| Schlüssel | Rotieren | Danach neu setzen |
|---|---|---|
| Supabase service_role / Secret Key | Supabase → Project Settings → API Keys: neuen Secret Key erzeugen, alten widerrufen. Bei Legacy-JWT-Schlüsseln: JWT-Secret rotieren (**meldet alle Nutzer ab**) | In Edge Functions automatisch; lokale `.env.security.local` prüfen |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys: neuen Key, alten löschen | `supabase secrets set ANTHROPIC_API_KEY=…` |
| `OPENAI_API_KEY` | platform.openai.com → API keys: neuen Key, alten widerrufen | `supabase secrets set OPENAI_API_KEY=…` |
| `SMTP_PASS` (One.com-Postfach) | One.com-Kontrollpanel → E-Mail → Postfach → Passwort ändern | `supabase secrets set SMTP_PASS=…` **und** Supabase → Authentication → SMTP Settings (Auth-Mails) |
| `CRON_SECRET` | Neuen Zufallswert erzeugen (≥ 32 Zeichen) | `supabase secrets set CRON_SECRET=…` **und** im SQL-Editor: `select vault.update_secret((select id from vault.secrets where name = 'cron_secret'), '<neuer Wert>');` |
| `MFA_CODE_PEPPER` (ab C-5) | **Nicht einfach rotieren:** Alle bestehenden Wiederherstellungscodes werden ungültig | Nach dem Rotieren alle Nutzer mit Faktor informieren, neue Codes zu erzeugen |
| GitHub-Zugang | github.com → Settings → Sessions / SSH and GPG keys / Personal access tokens: unbekannte entfernen | – |
| Vercel-Token | vercel.com → Account Settings → Tokens: widerrufen | – |

- [ ] Schlüssel rotiert und neu gesetzt
- [ ] Bei Supabase-Secrets: alle Functions neu deployen (`supabase functions deploy --no-verify-jwt`)
- [ ] Spend-Limits bei Anthropic und OpenAI prüfen bzw. senken

**Prüfen danach:** App-Smoke-Test (Gespräch, Admin-Bereich), `npm run security:test`. Kostenverlauf bei Anthropic und OpenAI der letzten Tage ansehen. Admin-Tab „Sicherheit“ beobachten.

**Dokumentieren:** Welcher Schlüssel, wo sichtbar, seit wann, wann rotiert. Wurde der Schlüssel nachweislich benutzt (Kosten, Logs)? → dann zusätzlich Szenario 3.

---

## Szenario 2: Admin-Konto kompromittiert

**Erkennen:** Alarm `admin_mfa_required` ohne eigenen Login, `mfa_recovery_used` ohne eigenes Handeln, Mail „Zweiter Faktor …“ ohne eigenes Handeln, unbekannte Einladungen im Admin-Bereich, geänderte Pläne oder Limits.

**Sofortmaßnahmen:**
- [ ] Passwort ändern (App → Profil bzw. Passwort-Reset-Mail)
- [ ] Alle Sitzungen beenden: Supabase → Authentication → Users → dein Konto → „Sign out user“ (bzw. Sessions löschen)
- [ ] Faktoren prüfen: dasselbe Konto → MFA Factors. Unbekannte Faktoren entfernen, eigenen neu einrichten
- [ ] Ist das E-Mail-Postfach selbst betroffen? → One.com-Passwort ändern (Szenario 1, SMTP)
- [ ] `is_admin` prüfen. SQL-Editor: `select count(*) from profiles where is_admin;` → erwartet 1
- [ ] Plan- und Limit-Änderungen der letzten Tage prüfen (Admin-Bereich → Nutzer)
- [ ] Supabase-, Vercel- und GitHub-Konto: Passwort und 2FA prüfen, unbekannte Sitzungen beenden

**Prüfen danach:** Anmelden mit Code klappt, Admin-Bereich lädt, `select count(*) from auth.mfa_factors f join profiles p on p.id = f.user_id where p.is_admin;` = Anzahl deiner Geräte.

**Dokumentieren:** Wie wurde es bemerkt, was wurde verändert, seit wann. Hatte der Angreifer Admin-Zugriff mit zweitem Faktor? → dann konnte er Nutzerlisten mit E-Mail-Adressen und Feedback sehen → **Szenario 3**.

---

## Szenario 3: Verdacht auf Datenabfluss

**Erkennen:** `userid_mismatch` außerhalb eines Angriffstests, viele `auth_rejected` gefolgt von Erfolgen, `export_burst`, Hinweis von außen (Nutzer, Sicherheitsforscher, Anbieter), Szenario 1 oder 2 mit nachgewiesener Nutzung.

**Sofortmaßnahmen:**
- [ ] **Uhrzeit der Kenntnis notieren** – ab hier läuft die 72-Stunden-Frist (Art. 33 DSGVO)
- [ ] Betroffene Function stilllegen. Wartungs-Stub deployen (Vorlage unten) oder im Notfall das Secret entziehen, das sie braucht (z. B. `supabase secrets unset ANTHROPIC_API_KEY` stoppt `chat`)
- [ ] Ursache schließen (Szenario 1 oder 2, Fehler im Code → Fix deployen)
- [ ] Logs sichern, **ohne Inhalte**: Export der Zähler aus dem Admin-Tab „Sicherheit“ (Screenshot), SQL nur mit Codes und Zählern, z. B. `select message, origin, count(*) from app_logs where created_at > now() - interval '7 days' group by 1, 2 order by 3 desc;`. Achtung: `app_logs` wird nach 30 Tagen gelöscht.
- [ ] Umfang abschätzen: Welche Tabellen, wie viele Konten, welcher Zeitraum? Nur über Zähler, keine Inhalte lesen.

**Meldung an die Aufsichtsbehörde (Art. 33 DSGVO):**
- **An:** Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen (LDI NRW), Meldeformular auf www.ldi.nrw.de
- **Frist:** **72 Stunden ab Kenntnis.** Unvollständig melden und nachreichen ist besser als zu spät melden.
- **Inhalt:** Art der Verletzung, Kategorien und ungefähre Zahl der Betroffenen und Datensätze, wahrscheinliche Folgen, ergriffene Maßnahmen, Kontakt.
- **Keine Meldung nötig**, wenn die Verletzung „voraussichtlich nicht zu einem Risiko“ führt. Die Begründung trotzdem im Protokoll festhalten (Rechenschaftspflicht). Bei Gesprächsinhalten, also Gesundheits- und sehr persönlichen Daten (Art. 9), ist praktisch immer von einem Risiko auszugehen.

**Information der Betroffenen (Art. 34 DSGVO)** ist nötig bei **voraussichtlich hohem Risiko**. Kriterien:
- Gesprächsinhalte, Coach-Akte, Krisenereignisse oder Innere Stimmen sind betroffen → **ja**
- Nur E-Mail-Adressen und Namen sind betroffen → meist nein, aber Phishing-Risiko abwägen
- Daten waren verschlüsselt bzw. der Zugriff ist nachweislich gescheitert → nein

Die Information erfolgt in klarer Sprache: was passiert ist, welche Daten, was du getan hast, was die Person tun kann (z. B. Passwort ändern), Kontakt.

**Prüfen danach:** `npm run security:test` alle PASS, Admin-Tab ohne neue Alarme über 48 Stunden, Kosten normal.

**Wartungs-Stub** (als `supabase/functions/<name>/index.ts` auf einem Notfall-Branch, dann `supabase functions deploy <name> --no-verify-jwt`):
```ts
Deno.serve(() => new Response(JSON.stringify({ error: 'maintenance' }), {
  status: 503, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
}));
```
Zurück: `main` auschecken und die Function normal deployen.

---

## Szenario 4: Kostenexplosion oder Missbrauch

**Erkennen:** Kostenwarnung von Anthropic oder OpenAI, `rate_limit_db_error`, viele `auth_rejected`, ein Konto mit auffällig vielen Sitzungen (Admin-Bereich → Nutzer).

**Sofortmaßnahmen:**
- [ ] Spend-Limit senken: console.anthropic.com → Settings → Limits; platform.openai.com → Settings → Limits
- [ ] Bei `rate_limit_db_error`: Rate-Limits laufen „fail-open“ (chat, post-conversation). DB-Status prüfen (Supabase → Reports / Database). Notfalls `chat` per Wartungs-Stub (Szenario 3) stilllegen
- [ ] Rate-Limits verschärfen: Werte in `supabase/functions/_shared/rateLimit.ts` → Functions deployen
- [ ] Betroffenes Konto sperren: Supabase → Authentication → Users → Konto → „Ban user“ (bzw. Limit im Admin-Bereich auf 0)
- [ ] Bei geleaktem Schlüssel → Szenario 1

**Prüfen danach:** Kostenverlauf über 24 Stunden, Admin-Tab ohne neue Alarme.

**Dokumentieren:** Höhe der Kosten, Ursache, Maßnahmen. Wurden dabei Daten anderer abgerufen? → Szenario 3.

---

## Szenario 5: Verlust deines zweiten Faktors

**Erkennen:** Handy verloren oder defekt, Authenticator-App gelöscht; der Admin-Bereich verlangt einen Code, den du nicht hast.

**Notfallweg (aus S-06, Entscheidung D-5):** Der Supabase-Dashboard-Zugang ist selbst mit eigenem zweiten Faktor geschützt.
- [ ] Zweites Gerät vorhanden? → damit anmelden, fertig (deshalb in der App „Zweites Gerät hinzufügen“)
- [ ] Sonst: Supabase-Dashboard anmelden → Authentication → Users → dein Konto → MFA-Faktoren entfernen. Alternativ im SQL-Editor: `delete from auth.mfa_factors where user_id = '<deine ID>';`
- [ ] In der App anmelden → Admin-Bereich → Faktor neu einrichten, zweites Gerät hinzufügen
- [ ] Ab C-5: Mit deinen eigenen Wiederherstellungscodes geht es auch ohne Dashboard
- [ ] Verlorenes Handy: Ist der Authenticator dort noch aktiv? Faktor dieses Geräts ist mit dem Schritt oben entfernt

**Wichtig:** Ohne Zugang zum Supabase-Dashboard (dessen 2FA, Wiederherstellungscodes von Supabase und GitHub) gibt es keinen Weg zurück. Diese Codes liegen ausgedruckt bei diesem Plan: ☐ ja

---

## Szenario 6: Wiederherstellung aus einem Backup

**Wann:** Daten wurden beschädigt oder gelöscht (Fehler in einer Migration, versehentliches SQL, Angriff mit Schreibzugriff).

**Vorher bedenken:**
- Eine Wiederherstellung setzt die **ganze Datenbank** auf den Stand des Backups zurück. Alles danach ist weg: neue Gespräche, Konten, Einwilligungen.
- **Löschpflicht:** Konten, die nach dem Backup gelöscht wurden, sind danach wieder da. Sie müssen erneut gelöscht werden (Art. 17 DSGVO). Liste vorher sichern: `select count(*) from app_logs where message = 'Account deleted' and created_at > '<Backup-Zeitpunkt>';`. Die IDs fehlen dort bewusst, deshalb zusätzlich die Liste der aktuellen `auth.users`-IDs vor dem Restore sichern (nur IDs, keine Inhalte) und danach abgleichen.

**Schritte:**
- [ ] Ursache stoppen (Function per Stub stilllegen, Zugang sperren)
- [ ] Aktuelle Nutzer-IDs sichern: `select id from auth.users order by 1;` (Datei offline, nach Abschluss löschen)
- [ ] Supabase → Database → Backups → passenden Zeitpunkt wählen → Restore (das Projekt ist währenddessen nicht erreichbar)
- [ ] Danach: `supabase migration list` – stimmen die Migrationen? Fehlende per `supabase db push`
- [ ] Konten abgleichen: IDs, die vor dem Restore fehlten (gelöscht), jetzt wieder vorhanden → über `delete-account`-Logik bzw. Dashboard erneut löschen, Löschtest-SQL (`supabase/security/deletion-check.sql`) je ID → überall 0
- [ ] Cron-Jobs prüfen: `select jobname, active from cron.job;` (erwartet: apply-retention, purge-app-logs, purge-rate-limits, purge-security-alerts, reset-monthly-sessions, security-monitor, weekly-supervision)
- [ ] Vault-Secret `cron_secret` vorhanden? `select count(*) from vault.secrets where name = 'cron_secret';` = 1
- [ ] `npm run security:test`, Smoke-Test

**Dokumentieren:** Backup-Zeitpunkt, verlorener Zeitraum, erneut gelöschte Konten (nur Anzahl). Gingen dabei Daten verloren, die Nutzer selbst eingegeben haben? → Betroffene informieren erwägen.

---

## 7. Betriebsstörungen (kein Sicherheitsvorfall, aber nicht liegen lassen)

| Alarm | Erste Schritte |
|---|---|
| `retention_missing` | `select jobname, active from cron.job where jobname = 'apply-retention';` · `select status, return_message, start_time from cron.job_run_details where jobid = (select jobid from cron.job where jobname = 'apply-retention') order by start_time desc limit 3;` · manuell: `select public.apply_retention();` |
| `supervision_missing` | Wie oben mit `weekly-supervision`. Danach Function-Logs `supervision` (Supabase → Edge Functions → supervision → Logs). Häufig: `cron_secret` in Vault und `CRON_SECRET` verschieden |
| Monitor-Lauf überfällig | Wie oben mit `security-monitor`. Ohne Monitor gibt es keine Alarme – zügig beheben |
| `delete_incomplete` | Nutzerwunsch auf Löschung steht. Function-Logs `delete-account` (Tabelle + Fehlercode), Ursache beheben, Löschung wiederholen lassen bzw. selbst ausführen, Löschtest-SQL für die ID |
| `assistant_insert_failed` / `message_insert_failed` | DB-Status (Supabase → Reports). Function-Logs `chat` (Fehlercode) |
| `learning_review_failed` | Anthropic-Status und Key prüfen. Bis zur Behebung entstehen keine Lernbasis-Einträge (fail-closed) |
| Mails kommen nicht an | Admin-Tab zeigt „keine Mail (Code)“. `smtp_not_configured`/`recipient_missing` → Secrets setzen; sonst One.com-Passwort und Port 465 prüfen. Die Alarme sind trotzdem im Admin-Tab |

---

## 8. Vorlage: Vorfallsprotokoll

```
Vorfall Nr.:            ____ / ______
Datum/Uhrzeit Kenntnis: ______________  (Beginn 72-h-Frist, falls Datenschutzverletzung)
Erkannt durch:          ☐ Alarm (Regel: ________)  ☐ Hinweis von außen  ☐ selbst bemerkt
Was ist passiert:       ________________________________________________
Betroffene Systeme:     ☐ Supabase  ☐ Vercel  ☐ Anthropic  ☐ OpenAI  ☐ One.com  ☐ GitHub
Betroffene Daten:       ☐ keine  ☐ E-Mail/Name  ☐ Gesprächsinhalte/Akte (Art. 9)  ☐ unklar
Anzahl Betroffene (ca.): ______

Maßnahmen (Uhrzeit – was – wer):
  __:__  ______________________________________________  Jerome
  __:__  ______________________________________________  Jerome

Meldung LDI NRW (Art. 33):     ☐ ja, am ______ um ______   ☐ nein, Begründung: ____________
Information Betroffener (Art. 34): ☐ ja, am ______ (Weg: ______)   ☐ nein, Begründung: ____________
Abgeschlossen am:       ______________
Lehre / Änderung danach: ________________________________________________
```

Ausgefüllte Protokolle **nicht** ins Repo legen (sie können personenbezogene Angaben enthalten), sondern offline aufbewahren.
