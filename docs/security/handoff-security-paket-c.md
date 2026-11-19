# Handoff: Security-Paket C (S-05 Code, S-09, S-22, S-11, S-16, S-06b)

> **Für:** Claude Code · **Von:** Jerome (vorbereitet mit Claude) · **Stand:** 19.11.2026, mittags · **Version:** v2 (ersetzt v1)
> **Grundlage:** `friedensstifter-security-paket-c-design-v2.md` (Lösungsdesign; **zuerst lesen**, besonders Abschnitt 1.4), `docs/security/paket-b-abschlussbericht.md`, `ARCHITECTURE.md` (Stand: Paket B abgeschlossen, CSP erzwingend)
> **Ziel:** Nahtlos an Paket B anschließen. B ist komplett; C läuft Welle für Welle nacheinander.
>
> | Welle | ID | Maßnahme |
> |---|---|---|
> | C-1 | S-05 (Code), S-09 | Secret-Scan (Historie + Build), sichere ZIP-Weitergabe · Functions fest in Frankfurt |
> | C-2 | S-22 | Monitoring mit Mail-Alarmen (nur Zähler), Admin-Tab „Sicherheit“, Notfallplan |
> | C-3 | S-11 | Feedback nur mit Einwilligung, 18+-Bestätigung, Hinweis zur Spracheingabe |
> | C-4 | S-16 | Datenexport als Selbstauskunft im Profil |
> | C-5 | S-06b | Zweiter Faktor für alle Nutzer (freiwillig) mit Wiederherstellungscodes, durchgesetzt in App, Functions und RLS |

---

## Entscheidungen (von Jerome vor dem Start eingetragen)

> Leere Felder = Empfehlung aus dem Lösungsdesign, Abschnitt 2. **Claude Code trifft keine dieser Entscheidungen selbst.**

| # | Frage | Empfehlung | Jeromes Entscheidung |
|---|---|---|---|
| C-1 | Altersgrenze | 18 | |
| C-2 | Bestandsnutzer 18+ | einmalige Bestätigung per Sheet | |
| C-3 | Krisenereignisse im Monitoring | nur Anzahl in der Wochenübersicht, keine Sofort-Mail | |
| C-4 | Umfang Datenexport | alles mit Personenbezug, inkl. Coach-Notizen und `crisis_events.notes` | |
| C-5 | MFA-Wiederherstellung für Nutzer | eigene Wiederherstellungscodes (10, gehasht) | |
| C-6 | Ort des MFA-Angebots | nur im Profil | |
| C-7 | Gefundene Secrets in der Historie | rotieren, Historie lassen | |
| C-8 | Mailkanal | One.com-SMTP über Port 465, Fallback Admin-Tab | |

---

## 0. Spielregeln für Claude Code

Alle Regeln aus Paket A und B gelten weiter (Abschnitt 0 im Handoff B). Neu bzw. besonders wichtig:

1. **Eine Welle zur Zeit.** Reihenfolge nach Abschnitt 1. Jede Welle startet auf einem eigenen Branch (`security/paket-c-<welle>`) **von aktuellem `main`**, nachdem die vorige gemergt ist.
2. **Migrationen:** Letzte eingespielte Nummer ist **033**. Paket C nutzt **034** (C-2), **035** (C-3), **036** (C-5). Ist der Ordner beim Start weiter, nimm die nächsten freien Nummern; leg nie eine Migration mit einer niedrigeren Nummer an als eine eingespielte. Die Zuordnung kommt in den Abschlussbericht.
3. **Schutz-Trigger `protect_profile_privileges()`:** Vorlage ist die **Fassung aus Migration 032** (mit den Opt-in-Spalten). Nur die Spaltenliste ändern.
4. **Feste Versionen** für jeden neuen Import in Edge Functions (`npm:…@x.y.z`, `https://deno.land/x/…@x.y.z`) und für neue devDependencies. Ohne Version zieht jeder Deploy die neueste (Ausfall 19.11.2026).
5. **Deploy-Lehre aus Paket B** in jedem STOPP: **erst mergen bzw. `main` auschecken, dann** `supabase db push` und `functions deploy`. Nach neuen oder geänderten RPCs im SQL-Editor `notify pgrst, 'reload schema';`. Die Supabase CLI bleibt während Paket C auf 2.95.4 (kein Update mitten im Paket).
6. **Neue Log-Codes sind Teil der Schnittstelle zu S-22.** Verwende genau die Codes aus diesem Dokument. Neue Codes trägst du in `_shared/monitorRules.ts` ein (Kommentar „nur Info“ oder mit Schwelle).
7. **Mails enthalten nie Inhalte aus dem Konto**, keine Nutzer-IDs und keine Fehlermeldungstexte von SMTP-Servern. Geloggt werden nur Fehlercodes.
8. **Neue Tabellen mit Personenbezug** gehören in den Export (S-16), in den Löschtest (S-15) und in `apply_retention` bzw. eine eigene Frist. Das kommt auch in `CLAUDE.md`.
9. **Keine Deploys, keine Secrets setzen.** Wie bisher an jedem **⛔ STOPP** an Jerome übergeben.

---

## 1. Fahrplan

| Schritt | Welle | Migration | Voraussetzung |
|---|---|---|---|
| 1 | **C-1** S-05 (Code), S-09 | – | J-C1 erledigt |
| 2 | **C-2** S-22 | 034 | C-1 gemergt; Jerome hat SMTP-Daten bereit |
| 3 | **C-3** S-11 | 035 | C-2 gemergt |
| 4 | **C-4** S-16 | – | C-3 gemergt (Tabellenstand inkl. `age_confirmed_at`) |
| 5 | **C-5** S-06b | 036 | C-4 gemergt |
| 6 | **C-Abschluss** | – | alles gemergt |

---

## 2. Phase 0: Bestandsaufnahme

Antworten mit Pfad und Zeile in `docs/security/paket-c-discovery.md`.

**Zu S-05:** `package.json` (Scripts, vorhandenes `postbuild`?), `vite.config.js` (`build.sourcemap`), `.gitignore`, liegt eine `.gitattributes` vor? Welche Dateien in `docs/security/` sind eingecheckt?

**Zu S-09:** Alle Stellen, an denen das Frontend Edge Functions aufruft (`fetch(…/functions/v1/…)`, `supabase.functions.invoke`). Wo sind die CORS-Header der Functions definiert (zentral oder je Function)?

**Zu S-22:** Spalten von `app_logs` (Name der Message- und Metadaten-Spalte, `level`, `source`, `created_at`). Mit welchem `message`-Code loggen heute: Rate-Limit-Ausfall (fail-open), `delete_incomplete`, `auth_delete_failed`, `mfa_verify_failed`, `userId mismatch`, `supervision_rejected`, `retention_applied`? Wie loggt `post-conversation` einen technischen Ausfall des Prüfschritts (`learning_rejected` mit Grund `review_api_failed`/`review_parse_failed`)? Loggt `errorResponse()` 401/403? Falls nicht: `logger.warn('auth_rejected', { status, code })` dort ergänzen, ohne Body- oder Header-Inhalte.

**Schalter-Stand:** Abschn. 5 der ARCHITECTURE.md nennt `RAG_LEARNING_ENABLED` und `SUPERVISION_IN_PROMPT` „seit 19.11.2026 an“, BLOCK 5 und der Abschnitt `supervision` sagen beim Supervision-Schalter noch „derzeit aus“. Jerome bestätigt in J-C1 den echten Stand; du korrigierst die Doku in C-2.

**Zu S-11:** Feedback-Modal (Datei, Insert-Aufruf, Felder), `feedback_surveys` (gibt es eine Einwilligungsspalte?), Insert-Policies beider Tabellen (Namen), `handle_new_user` (aktuelle Fassung aus 027), Registrierung in `Step4Auth` (Passwort-Weg; Magic Link legt keine Konten an), Invite-Flow (`user.invited_at`), Mikrofon-Button (`ChatInput`, `useVoiceInput`). Wird `consent_ip` irgendwo gelesen oder geschrieben (Frontend, Functions, `deletion-check.sql`)?

**Zu S-16:** Alle Tabellen mit `user_id`, `source_user_id`, `conversation_id` (Stand nach Migration 033; die Prüfpunkte aus `deletion-check.sql` sind ein guter Abgleich). PostgREST-Zeilenlimit (`max_rows`) des Projekts.

**Zu S-06b:** Liefert `admin.auth.getUser(token)` das Feld `user.factors` mit `status`? (Falls nicht: `admin.auth.admin.mfa.listFactors({ userId })`.) Welche SECURITY-DEFINER-RPCs ruft der Client direkt auf? Wie lädt `useAuth` das Profil, und was passiert, wenn die Abfrage 0 Zeilen liefert (Weiterleitung ins Onboarding?).

### Metadaten-SQL für Jerome (`supabase/security/paket-c-audit.sql`)

```sql
-- Friedensstifter Security-Audit Paket C (nur Metadaten)

-- A) Policies für authenticated (Grundlage für die MFA-Policies in C-5)
select tablename, policyname, cmd, permissive, roles
from pg_policies where schemaname = 'public' and 'authenticated' = any(roles)
order by 1, 3;

-- B) Spalten von app_logs, user_feedback, feedback_surveys
select table_name, column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public' and table_name in ('app_logs', 'user_feedback', 'feedback_surveys')
order by 1, ordinal_position;

-- C) Feedback ohne echte Einwilligung (nur Zähler)
select count(*) filter (where consent_given) as with_consent, count(*) as total from public.user_feedback;

-- D) Häufigkeit der Log-Codes der letzten 7 Tage (für die Schwellen in S-22; Spaltennamen ggf. anpassen)
select message, level, count(*) from public.app_logs
where created_at > now() - interval '7 days'
group by 1, 2 order by 3 desc limit 60;

-- E) Funktionen, die authenticated ausführen darf
select p.proname, p.prosecdef as security_definer
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and has_function_privilege('authenticated', p.oid, 'execute')
order by 1;
```

### ⛔ STOPP J-C1

> 👤 **Jerome:**
> 1. Dieses Dokument und das Lösungsdesign C nach `docs/security/` legen.
> 2. Entscheidungen C-1 bis C-8 eintragen (leer = Empfehlung).
> 3. `paket-c-audit.sql` ausführen, Ergebnis als `docs/security/paket-c-audit-result.md` übergeben (**nicht** committen).
> 4. `gitleaks` installieren (`brew install gitleaks` oder Docker).
> 5. Echten Stand der Schalter bestätigen: `RAG_LEARNING_ENABLED` = ? · `SUPERVISION_IN_PROMPT` = ? (Supabase → Edge Functions → Secrets).

---

## 3. Welle C-1: S-05 (Code-Teil) und S-09

### 3.1 Secret-Scan der Historie

**`.gitleaks.toml`**
```toml
title = "Friedensstifter"

[extend]
useDefault = true

[allowlist]
description = "Öffentliche Werte"
regexes = ['''dpvqysabgycdjawkdrah\.supabase\.co''']
paths = ['''package-lock\.json''']
```

**`scripts/security/secret-scan.mjs`** (npm-Script `security:secrets`)
- Ruft `gitleaks` über die **gesamte Historie** auf (`gitleaks git . …` bzw. bei älteren Versionen `gitleaks detect --source . …`). Der JSON-Report geht in eine Datei im **OS-Temp-Verzeichnis**, nie ins Repo.
- Wertet den Report aus: Ist der Fund ein JWT, wird die Payload dekodiert. `role: anon` wird als „öffentlich (anon-Key)“ gekennzeichnet und nicht als Fehler gezählt. Alles andere ist ein Fund.
- Ausgabe je Fund **nur**: Regel, Datei, Commit (kurz), Zeile, Datum. **Nie** der Wert selbst, auch nicht gekürzt.
- Löscht den Temp-Report in `finally`. Exit-Code 1 bei mindestens einem Fund.

### 3.2 Build-Prüfung

**`scripts/security/check-build.mjs`** (in `package.json` als `"postbuild"`; läuft dadurch auch auf Vercel)

```js
// Kern
const PATTERNS = [
  ['anthropic_key', /sk-ant-[A-Za-z0-9_-]{20,}/],
  ['openai_key', /\bsk-(proj-)?[A-Za-z0-9_-]{32,}/],
  ['secret_env_name', /\b(SUPABASE_SERVICE_ROLE_KEY|SMTP_PASS|CRON_SECRET|ANTHROPIC_API_KEY|OPENAI_API_KEY|MFA_CODE_PEPPER)\b/],
];
const JWT = /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;
// Für jede Datei in dist/ (rekursiv, .js .html .css .json .map .webmanifest):
//   PATTERNS → Fund (nur Dateiname + Typ ausgeben)
//   JWT → Payload dekodieren; role !== 'anon' → Fund 'non_anon_jwt'
// Außerdem: liegt eine .map-Datei in dist/, Hinweis ausgeben (Sourcemaps in Produktion vermeiden)
// Fund → process.exit(1)  (der Build scheitert, Vercel deployt nicht)
```

### 3.3 Sichere ZIP-Weitergabe

- **`.gitattributes`** ergänzen:
  ```
  .env* export-ignore
  *.har export-ignore
  *.csv export-ignore
  docs/security/*audit-result* export-ignore
  ```
- **`scripts/share-zip.mjs`** (npm-Script `share:zip`): `git archive --format=zip -o ../friedensstifter-share-<JJJJ-MM-TT>.zip HEAD` über `child_process`. Zeigt `git status --porcelain` nicht-committete Änderungen, kommt der Hinweis „Nicht committete Änderungen sind nicht im ZIP“.
- In `CLAUDE.md`: „ZIPs für Chats nur über `npm run share:zip`.“

### 3.4 S-09: Region festlegen

**Neu: `src/lib/functions.js`**
```js
import { FunctionRegion } from '@supabase/supabase-js';
export const FUNCTIONS_REGION = 'eu-central-1';
export const INVOKE_REGION = FunctionRegion.EuCentral1;

export function functionHeaders(accessToken, extra = {}) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'x-region': FUNCTIONS_REGION,
    ...extra,
  };
}
```
- Alle `fetch`-Aufrufe an Functions (inkl. `keepalive`-Pfade von `runPostConversation`) nutzen `functionHeaders(…)`. Alle `supabase.functions.invoke(name, { … })` bekommen `region: INVOKE_REGION`.
- CORS aller Functions: `Access-Control-Allow-Headers` um `x-region` ergänzen. Ist das je Function definiert, bei dieser Gelegenheit in `_shared/cors.ts` zusammenführen.
- Angriffstest #32 (Abschnitt 9) prüft `x-sb-edge-region`.

### ⛔ STOPP J-C2

> 👤 **Jerome:**
> 1. `npm run security:secrets` lokal ausführen. Bei Funden: Schlüssel in der jeweiligen Konsole rotieren (C-7) und neu setzen. Ergebnis (nur Anzahl, Regel, Datei) an Claude Code.
> 2. Diff prüfen, mergen. Vercel-Build muss grün sein (die Build-Prüfung läuft mit).
> 3. **Alle** Functions deployen (CORS-Änderung): `supabase functions deploy` je Function wie in ARCHITECTURE.md Abschn. 11.
> 4. Kurzer Smoke-Test: Gespräch, „Neues Gespräch“, Admin-Bereich. In den DevTools bei einem Function-Aufruf den Antwort-Header `x-sb-edge-region: eu-central-1` prüfen.
> 5. `npm run share:zip` einmal ausprobieren und das ZIP stichprobenartig öffnen (keine `.env`).

---

## 4. Welle C-2: S-22 Monitoring und Notfallplan

### 4.1 Migration `034_s22_security_monitoring.sql`

```sql
-- S-22: Alarme (nur Zähler), Zählfunktion über app_logs, Cron-Jobs

create table if not exists public.security_alerts (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null default 'alert' check (kind in ('alert', 'weekly_digest', 'probe')),
  rule         text not null,
  window_start timestamptz not null,
  window_end   timestamptz not null,
  count        integer not null default 0,
  details      jsonb not null default '{}'::jsonb,   -- nur Zähler und Codes
  mailed_at    timestamptz,
  mail_error   text,                                 -- nur Fehlercode
  created_at   timestamptz not null default now()
);
alter table public.security_alerts enable row level security;
revoke all on public.security_alerts from anon, authenticated;
create index if not exists security_alerts_rule_created_idx on public.security_alerts (rule, created_at desc);

-- Zählt Log-Codes, gibt keine Inhalte zurück (Spaltennamen aus Phase 0 übernehmen)
create or replace function public.security_log_counts(p_since timestamptz, p_codes text[])
returns table (code text, n bigint)
language sql stable security definer set search_path = ''
as $$
  select l.message, count(*)
  from public.app_logs l
  where l.created_at >= p_since and l.message = any (p_codes)
  group by l.message;
$$;
revoke all on function public.security_log_counts(timestamptz, text[]) from public, anon, authenticated;
grant execute on function public.security_log_counts(timestamptz, text[]) to service_role;

-- stündlicher Lauf (URL wie beim weekly-supervision-Job; Secret aus Vault)
select cron.unschedule('security-monitor') where exists (select 1 from cron.job where jobname = 'security-monitor');
select cron.schedule('security-monitor', '7 * * * *', $$
  select net.http_post(
    url     := '<FUNCTIONS_BASE_URL>/security-monitor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body    := '{}'::jsonb)
$$);

select cron.unschedule('purge-security-alerts') where exists (select 1 from cron.job where jobname = 'purge-security-alerts');
select cron.schedule('purge-security-alerts', '29 3 * * *',
  $$ delete from public.security_alerts where created_at < now() - interval '12 months' $$);
```
`<FUNCTIONS_BASE_URL>` genauso bilden wie im bestehenden `weekly-supervision`-Job (Phase 0).

### 4.2 `_shared/monitorRules.ts`

```ts
export interface Rule { id: string; codes: string[]; windowMin: number; threshold: number; infoOnly?: boolean }

export const RULES: Rule[] = [
  { id: 'auth_rejected',           codes: ['auth_rejected'],           windowMin: 60,   threshold: 51 },
  { id: 'userid_mismatch',         codes: ['userId mismatch'],         windowMin: 60,   threshold: 1 },
  { id: 'admin_mfa_required',      codes: ['mfa_required'],            windowMin: 60,   threshold: 3 },
  { id: 'mfa_verify_failed',       codes: ['mfa_verify_failed'],       windowMin: 60,   threshold: 5 },
  { id: 'assistant_insert_failed', codes: ['assistant_insert_failed'], windowMin: 60,   threshold: 1 },
  { id: 'message_insert_failed',   codes: ['message_insert_failed'],   windowMin: 60,   threshold: 3 },
  { id: 'rate_limit_db_error',     codes: ['<Code aus Phase 0>'],      windowMin: 60,   threshold: 1 },
  { id: 'delete_incomplete',       codes: ['delete_incomplete', 'auth_delete_failed'], windowMin: 60, threshold: 1 },
  { id: 'learning_review_failed',  codes: ['learning_review_failed'],  windowMin: 1440, threshold: 5 },
  { id: 'supervision_rejected',    codes: ['supervision_rejected'],    windowMin: 10080, threshold: 2 },
  // ab C-4 / C-5:
  { id: 'export_burst',            codes: ['export_created'],          windowMin: 60,   threshold: 10 },
  { id: 'mfa_recovery_used',       codes: ['mfa_recovery_used'],       windowMin: 60,   threshold: 1 },
  { id: 'mfa_recovery_failed',     codes: ['mfa_recovery_failed'],     windowMin: 60,   threshold: 5 },
  // nur in der Wochenübersicht:
  { id: 'user_mfa_required',       codes: ['user_mfa_required'],       windowMin: 10080, threshold: 0, infoOnly: true },
  { id: 'legacy_format',           codes: ['legacy_format'],           windowMin: 10080, threshold: 0, infoOnly: true },
  { id: 'learning_entry_saved',    codes: ['learning_entry_saved'],    windowMin: 10080, threshold: 0, infoOnly: true },
  { id: 'learning_rejected',       codes: ['learning_rejected'],       windowMin: 10080, threshold: 0, infoOnly: true },
];

// Lebenszeichen: Alarm, wenn ein erwarteter Eintrag AUSBLEIBT (stilles Scheitern von Cron-Jobs)
export const HEARTBEATS = [
  { id: 'retention_missing',   kind: 'log',        code: 'retention_applied', maxAgeHours: 26 },
  { id: 'supervision_missing', kind: 'supervision', weekday: 1, afterHourUtc: 8 },  // montags ab 08:00 UTC: supervision_logs für diese Woche vorhanden?
] as const;
export const COOLDOWN_HOURS = 6;
```
**Neue Log-Zeile, die C-2 ergänzt:** In `post-conversation` (Schritt 6) und in `supervision` zusätzlich `logger.warn('learning_review_failed')`, wenn `reviewLearningEntry` mit `review_api_failed` oder `review_parse_failed` endet. Der bestehende Log `learning_rejected` bleibt unverändert.

`admin_mfa_required` hört auf `mfa_required` aus `requireAdmin`. In C-5 loggt `requireUser` für normale Nutzer deshalb **`user_mfa_required`**, damit Nutzer-Anmeldungen keinen Admin-Alarm auslösen.

### 4.3 `_shared/mailer.ts`

```ts
// SMTP über Port 465 (implizites TLS). Port 25/587 sind aus Edge Functions nicht erreichbar.
import { SMTPClient } from 'https://deno.land/x/denomailer@<aktuelle Version pinnen>/mod.ts';

export async function sendMail(to: string, subject: string, text: string): Promise<{ ok: boolean; code?: string }> {
  const host = Deno.env.get('SMTP_HOST'); const port = Number(Deno.env.get('SMTP_PORT') ?? '465');
  const user = Deno.env.get('SMTP_USER'); const pass = Deno.env.get('SMTP_PASS');
  const from = Deno.env.get('ALERT_EMAIL_FROM') ?? user;
  if (!host || !user || !pass) return { ok: false, code: 'smtp_not_configured' };
  if (port !== 465) return { ok: false, code: 'smtp_port_not_supported' };
  const client = new SMTPClient({ connection: { hostname: host, port, tls: true, auth: { username: user, password: pass } } });
  try {
    await withTimeout(client.send({ from: `Friedensstifter <${from}>`, to, subject, content: text }), 10_000);
    return { ok: true };
  } catch (e) {
    return { ok: false, code: (e as Error)?.name ?? 'smtp_error' };   // keine Fehlermeldung (kann Adressen enthalten)
  } finally {
    try { await client.close(); } catch { /* egal */ }
  }
}
```

### 4.4 Function `security-monitor` (nur intern)

```
requireInternalCaller
body.probe === true → Testmail „Test: Alarmkanal Friedensstifter“ an ALERT_EMAIL_TO,
                      security_alerts { kind: 'probe', rule: 'probe', mailed_at | mail_error }, Antwort { ok, code? }
sonst:
  für jede Regel (ohne infoOnly): Zählung über security_log_counts(now - windowMin, codes)
    count ≥ threshold und kein Alarm derselben Regel in den letzten COOLDOWN_HOURS
      → security_alerts { kind: 'alert', … } → Mail (Text unten) → mailed_at bzw. mail_error
  Lebenszeichen (HEARTBEATS): retention_applied jünger als 26 Std.? montags ab 08:00 UTC supervision_logs
      für die laufende Woche vorhanden? Fehlt etwas → Alarm wie oben (gleicher Cooldown)
  Montag, Stunde 6 UTC, und noch keine weekly_digest-Zeile in dieser Woche:
      → alle Regeln über 7 Tage zählen
      + crisis_events: neue in 7 Tagen, ungesichtet gesamt (nur Anzahl; C-3)
      + inactive_accounts_report(24): nur Anzahl
      → security_alerts { kind: 'weekly_digest', details: { counts } } → Mail
Antwort: { ok, alerts: <Anzahl> }   (nichts weiter)
```

**Mail-Text (Alarm):**
```
Betreff: Friedensstifter · Sicherheitsalarm: <rule>
<rule>: <count> Ereignisse zwischen <window_start> und <window_end> (UTC).
Details im Admin-Bereich unter „Sicherheit“. Notfallplan: docs/security/notfallplan.md
```
**Mail-Text (Woche):** Tabelle „Regel – Anzahl (7 Tage)“, Krisenereignisse neu/ungesichtet, Hinweis auf den Admin-Tab. Keine IDs, keine Inhalte.

### 4.5 Function `admin-security` + Admin-Tab „Sicherheit“

- `admin-security` (GET): `requireUser` + `requireAdmin` (aal2). Liefert die letzten 50 `security_alerts` (ohne `mail_error`-Details über den Code hinaus) und die neueste Wochenübersicht.
- `AdminUsersScreen`: dritter Tab „Sicherheit“ mit Liste (Zeit, Regel, Anzahl, Mail gesendet ja/nein) und Wochenübersicht. Leerer Zustand: „Keine Auffälligkeiten.“
- `supabase/config.toml`: `verify_jwt = false` für beide neuen Functions.

### 4.6 Notfallplan

`docs/security/notfallplan.md` nach Lösungsdesign 4.3 (sechs Szenarien). Jedes Szenario mit: Erkennen (welcher Alarm oder welches Signal), Sofortmaßnahmen als Checkliste, konkrete Konsolen-Pfade (Supabase, Vercel, Anthropic, OpenAI, One.com, GitHub), Prüfen danach, Dokumentieren. Für Szenario 3: Frist **72 Stunden** ab Kenntnis, Meldung an die **LDI NRW** (Art. 33 DSGVO); Kriterien für die Information Betroffener (Art. 34). Vorlage für ein Vorfallsprotokoll (Datum, was, wer, Maßnahmen, Meldung ja/nein mit Begründung). Hinweis oben: „Ausgedruckt oder offline griffbereit halten.“

Zusätzlich in C-2: die Widersprüche zum Supervision-Schalter in der ARCHITECTURE.md (Abschn. 5, BLOCK 5 und `supervision`) nach Jeromes Angabe aus J-C1 bereinigen.

### ⛔ STOPP J-C3

> 👤 **Jerome:**
> 1. Secrets setzen: `supabase secrets set SMTP_HOST=<One.com-SMTP-Host> SMTP_PORT=465 SMTP_USER=<Postfach> SMTP_PASS=<Passwort> ALERT_EMAIL_FROM=<Absender> ALERT_EMAIL_TO=<deine Adresse>`. Host und Port findest du im One.com-Kontrollpanel unter den E-Mail-Einstellungen; gesucht ist SMTP mit SSL/TLS (Port 465).
> 2. Mergen bzw. `main` auschecken, Backup, dann `supabase db push` und `notify pgrst, 'reload schema';`. Danach `supabase functions deploy security-monitor admin-security post-conversation supervision` plus jede Function, in der `auth_rejected` ergänzt wurde (bei Änderungen an `_shared/*` alle, die das Modul importieren).
> 3. **Probe:** im SQL-Editor den Aufruf wie im Cron-Job ausführen, aber mit `body := '{"probe": true}'::jsonb`. Kommt die Testmail an? Danach `select kind, mailed_at, mail_error from security_alerts where kind = 'probe' order by created_at desc limit 1;` an Claude Code.
>    - **Keine Mail, `mail_error` gesetzt:** Port 465 ist aus den Edge Functions nicht erreichbar. Alarme laufen dann zunächst nur im Admin-Tab (C-8); Entscheidung über einen Mail-Dienst später.
> 4. Admin-Bereich → Tab „Sicherheit“ öffnen.
> 5. `docs/security/notfallplan.md` lesen, anpassen, freigeben und ausdrucken.

---

## 5. Welle C-3: S-11

### 5.1 Migration `035_s11_privacy_fixes.sql`

```sql
-- S-11: Einwilligung beim Feedback, Altersbestätigung, Datenminimierung

-- 1. Feedback nur mit Einwilligung (echten Policy-Namen aus dem Audit einsetzen)
alter table public.user_feedback alter column consent_given set default false;
drop policy if exists "<user_feedback_insert_policy>" on public.user_feedback;
create policy user_feedback_insert_own_with_consent on public.user_feedback
  for insert to authenticated
  with check (user_id = (select auth.uid()) and consent_given = true);
-- feedback_surveys: analog, falls Phase 0 eine Einwilligungsspalte gefunden hat; sonst im Bericht begründen.

-- 2. Altersbestätigung
alter table public.profiles add column if not exists age_confirmed_at timestamptz;

-- 3. Schutz-Trigger ZUERST anpassen (Vorlage: Fassung aus Migration 032):
--    + age_confirmed_at in die gesperrte Liste
--    − consent_ip aus der Liste entfernen
--    Reihenfolge wichtig: Referenziert der Trigger eine gelöschte Spalte, scheitert jedes Profil-Update.
-- create or replace function public.protect_profile_privileges() … ;

-- 4. Danach die ungenutzte Spalte entfernen (Phase 0: keine Lese- oder Schreibstelle mehr)
alter table public.profiles drop column if exists consent_ip;

-- 5. handle_new_user: age_confirmed_at = now(), wenn raw_user_meta_data->>'age_confirmed' = 'true'
--    (Vorlage: Fassung aus Migration 027, sonst unverändert)
--    Falls deletion-check.sql oder eine Function consent_ip nennt (Phase 0): dort mit entfernen.

-- 6. Bestandsnutzer bestätigen selbst
create or replace function public.confirm_age()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  update public.profiles set age_confirmed_at = coalesce(age_confirmed_at, now()) where id = auth.uid();
end;
$$;
revoke all on function public.confirm_age() from public, anon;
grant execute on function public.confirm_age() to authenticated;
```

### 5.2 Frontend

- **Onboarding** (`Step4Auth`, Registrierung mit Passwort): Pflicht-Häkchen „Ich bin mindestens 18 Jahre alt.“ mit Text aus Lösungsdesign 5.1. Ohne Häkchen ist „Konto erstellen“ inaktiv. `signUp(email, password, displayName, { …meta, age_confirmed: true })` über das bestehende `meta`. Magic Link legt keine Konten an und braucht deshalb kein Häkchen; eingeladene Nutzer bestätigen über das Bestandsnutzer-Sheet.
- **Bestandsnutzer:** Nach dem Login (und vor dem ersten Screen innerhalb `AppShell`) bei `profile.age_confirmed_at == null` ein Sheet nach 5.1. „Ja …“ → `rpc('confirm_age')` → Profil neu laden. „Ich bin jünger“ → Hinweis mit 116 111 und Link zum bestehenden Löschweg im Profil. Kein automatisches Löschen.
- **Feedback-Modal:** Häkchen nach 5.2. Senden erst mit Häkchen, Insert mit `consent_given: true`. Fehler beim Insert sichtbar machen, kein Erfolgshinweis ohne Erfolg.
- **Spracheingabe:** Beim ersten Mikrofon-Tipp pro Gerät Hinweis nach 5.3 (`localStorage`-Schlüssel `fs_voice_hint_v1`, Zugriff in `try/catch`; ohne Storage jedes Mal zeigen). „Lieber tippen“ fokussiert das Textfeld.
- **Datenschutzerklärung** (`DatenschutzScreen`): keine Textänderung durch Claude Code. Im Bericht notieren, welche Sätze Jerome für R-2 anpassen sollte (Altersgrenze, Spracheingabe, Feedback-Einwilligung).

### ⛔ STOPP J-C4

> 👤 **Jerome:** Mergen bzw. `main` auschecken, Backup, `supabase db push`, `notify pgrst, 'reload schema';`. Test: (a) neues Testkonto mit Onboarding: ohne Häkchen kein Weiter, mit Häkchen ist `age_confirmed_at` gesetzt; (b) dein Konto: Sheet erscheint einmal; (c) Feedback ohne Häkchen ist nicht sendbar; (d) Mikrofon: Hinweis einmal pro Gerät; (e) Profil bearbeiten funktioniert weiter (Schutz-Trigger).

---

## 6. Welle C-4: S-16 Datenexport

### 6.1 Function `export-my-data`

```
POST, requireUser (ab C-5 automatisch aal2-Pflicht bei Faktor)
Rate-Limit 'export': 3/Tag, fail-closed
uid = ctx.user.id ; convIds = alle eigenen conversations.id
Sammeln (alles über admin, IMMER mit Filter auf uid bzw. convIds, seitenweise à 1000 Zeilen):
  konto:        admin.auth.admin.getUserById(uid) → { email, created_at, last_sign_in_at }
                MFA-Faktoren → { friendly_name, factor_type, status, created_at } (keine IDs/Geheimnisse)
                profiles (id = uid)
  gespraeche:   conversations (user_id), messages (conversation_id ∈ convIds)
  spiegel_akte: insights, coach_file_entries, coachee_profile, user_memory, pattern_references, inner_voices
  coach_notizen: session_notes, resonance_map, coach_reflections (conversation_id ∈ convIds)
  sicherheit_support: crisis_events (inkl. notes, C-4), user_feedback, feedback_surveys, app_logs (user_id), rate_limit_counters
  lernbasis:    experience_patterns where source_user_id = uid → ohne embedding
  hinweise:     conversation_context → nur [{ conversation_id, vorhanden: true }] (enthält Daten Dritter)
Entfernen: jede Spalte 'embedding', 'code_hash', interne Tokens
Antwort: application/json, Content-Disposition: attachment; filename="friedensstifter-export-<JJJJ-MM-TT>.json"
Log: export_created { tables: <Anzahl>, rows: <Anzahl> }  · Mail an die eigene E-Mail (falls Mailkanal steht)
```

- Struktur der Datei: `{ "_erklaerung": { … }, "erstellt_am": "…", "konto": {…}, "gespraeche": {…}, … }`. `_erklaerung` erklärt jede Gruppe in einem Satz, nennt den Verantwortlichen (Name, Anschrift aus dem Impressum) und eine Kontaktadresse.
- **Tabellenliste als Konstante** `EXPORT_TABLES` in der Function. Phase 0 liefert die Liste aller Tabellen mit Personenbezug. Ist eine Tabelle dort, aber nicht in `EXPORT_TABLES` oder in der Ausschlussliste mit Begründung, gilt das als Fehler im Bericht.
- Fehler in **einer** Tabelle → `500 export_incomplete` (geloggt mit Tabellenname und Code). Kein unvollständiger Export ohne Hinweis.
- `supervision_logs` steht in der Ausschlussliste („Wochen-Zähler und allgemeine Empfehlungen ohne Personenbezug“).
- **Doku-Anpassung in dieser Welle:** ARCHITECTURE.md Abschn. 10 („Datenexport S-16 … über `requireAdmin`“) auf die Selbstauskunft umstellen; bei `crisis_events.notes` „nie dem Nutzer sichtbar“ ersetzen durch „im Alltag nicht sichtbar, Teil der Selbstauskunft (Art. 15)“, falls C-4 = alles.

### 6.2 Frontend

- `ProfileScreen` → Abschnitt Datenschutz → „Meine Daten herunterladen“ → Sheet nach 5.4 → `fetch` mit `functionHeaders`, Antwort als Blob, Download über einen temporären Link (`URL.createObjectURL`, danach `revokeObjectURL`).
- 429: Text nach 5.4. Andere Fehler: „Das hat gerade nicht geklappt. Versuch es bitte später noch einmal.“

### ⛔ STOPP J-C5

> 👤 **Jerome:** Mergen bzw. `main` auschecken, dann `supabase functions deploy export-my-data`. Export mit **Testkonto A** erstellen und die Datei öffnen: Sind alle Bereiche da? Ist nichts von anderen Menschen drin? Danach mit deinem eigenen Konto. Prüfen, ob die Bestätigungsmail kommt (falls Mailkanal aktiv).

---

## 7. Welle C-5: S-06b Zweiter Faktor für alle

### 7.1 Reihenfolge beim Deploy (wichtig)

Dein Admin-Konto hat schon einen Faktor. Die neue RLS-Policy würde deine `aal1`-Sitzungen sofort leer laufen lassen. Deshalb gilt die Reihenfolge **Frontend → Functions → Migration** (siehe J-C6).

### 7.2 Migration `036_s06b_user_mfa.sql`

```sql
-- S-06b: Wer einen verifizierten Faktor hat, braucht aal2 – auch direkt an der Datenbank

create or replace function public.mfa_satisfied()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal') = 'aal2', false)
      or not exists (
        select 1 from auth.mfa_factors f
        where f.user_id = (select auth.uid()) and f.status = 'verified'
      );
$$;
revoke all on function public.mfa_satisfied() from public, anon;
grant execute on function public.mfa_satisfied() to authenticated;

-- Restriktive Policy auf jeder Tabelle mit Client-Rechten (Liste aus Audit A; app_logs bewusst ausgenommen,
-- damit Logging vor der Code-Eingabe funktioniert)
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'conversations', 'messages', 'insights', 'user_memory', 'inner_voices',
    'coach_file_entries', 'coachee_profile', 'session_notes', 'pattern_references',
    'user_feedback', 'feedback_surveys'
  ] loop
    execute format('drop policy if exists mfa_required on public.%I', t);
    execute format(
      'create policy mfa_required on public.%I as restrictive for all to authenticated '
      'using ((select public.mfa_satisfied())) with check ((select public.mfa_satisfied()))', t);
  end loop;
end $$;

-- Wiederherstellungscodes (nur Hash, nur service_role)
create table if not exists public.mfa_recovery_codes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  code_hash  text not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
alter table public.mfa_recovery_codes enable row level security;
revoke all on public.mfa_recovery_codes from anon, authenticated;
create index if not exists mfa_recovery_codes_user_idx on public.mfa_recovery_codes (user_id);
```

**Zusätzlich:** Jede SECURITY-DEFINER-RPC, die der Client direkt aufruft (Audit E, mindestens `set_learning_opt_in` aus Migration 032 und `confirm_age` aus 035), bekommt als erste Zeile:
```sql
if not public.mfa_satisfied() then
  raise exception 'mfa_required' using errcode = '42501';
end if;
```
`get_conversation_history` ist `SECURITY INVOKER` und damit durch die Policies abgedeckt. `consume_session` ruft nur `chat` auf, das über `requireUser` geschützt ist.

### 7.3 `requireUser`: aal2 bei vorhandenem Faktor

```ts
// _shared/auth.ts – NACHHER (Ergänzung am Ende von requireUser)
export async function requireUser(req: Request, opts: { allowAal1?: boolean } = {}): Promise<AuthContext> {
  // … bestehende Prüfung, liefert user, token, admin, userClient …
  const hasVerifiedFactor = (user.factors ?? []).some((f) => f.status === 'verified');
  if (hasVerifiedFactor && !opts.allowAal1) {
    const claims = readVerifiedClaims(token);
    if (claims.aal !== 'aal2') {
      logger.info('user_mfa_required');               // NICHT 'mfa_required' (das ist der Admin-Alarm)
      throw new HttpError(403, 'mfa_required');
    }
  }
  return { user, token, admin, userClient };
}
```
Liefert `getUser` keine `factors`: `admin.auth.admin.mfa.listFactors({ userId })` verwenden. `allowAal1: true` setzt **nur** `mfa-recovery` für die Aktion `recover`.

### 7.4 Function `mfa-recovery`

| Aktion | Voraussetzung | Ablauf | Log | Mail |
|---|---|---|---|---|
| `codes:generate` (`{ afterEnroll?: boolean }`) | aal2 | Alte Codes löschen, 10 neue erzeugen, HMAC-SHA-256 mit Secret `MFA_CODE_PEPPER` speichern, Codes **einmalig** zurückgeben. Rate-Limit 5/Tag. | `mfa_codes_generated` | bei `afterEnroll`: „Zweiter Faktor eingerichtet“ |
| `recover` (`{ code }`) | `requireUser(req, { allowAal1: true })` | Rate-Limit 5/Std + 10/Tag, **fail-closed**. Code normalisieren (Großbuchstaben, ohne Bindestrich), HMAC, unbenutzten Code des Nutzers suchen. Kein Treffer → `400 invalid_code`. Treffer → `used_at` setzen, alle Faktoren über `admin.auth.admin.mfa.deleteFactor({ id, userId })` entfernen, restliche Codes löschen. | `mfa_recovery_used` bzw. `mfa_recovery_failed` | „Wiederherstellungscode verwendet“ |
| `disable` | aal2 | Alle Faktoren und Codes entfernen. | `mfa_disabled` | „Zweiter Faktor entfernt“ |

```ts
// Code-Format: 10 Zeichen aus Base32 ohne verwechselbare Zeichen, angezeigt als XXXXX-XXXXX
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newCode(): string {
  const b = crypto.getRandomValues(new Uint8Array(10));
  const s = Array.from(b, (x) => ALPHABET[x % ALPHABET.length]).join('');
  return `${s.slice(0, 5)}-${s.slice(5)}`;
}
async function hashCode(code: string): Promise<string> {
  const norm = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(Deno.env.get('MFA_CODE_PEPPER')!),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(norm));
  return Array.from(new Uint8Array(sig), (x) => x.toString(16).padStart(2, '0')).join('');
}
```
Weder Codes noch Hashes werden geloggt. Mails nach Lösungsdesign 5.5, an die E-Mail des Kontos, ohne weitere Daten.

### 7.5 Frontend

- **Gemeinsame Bausteine** aus `AdminMfaScreen` herauslösen: `src/components/mfa/MfaEnrollFlow.jsx` (QR, Schlüssel, Code), `MfaCodeForm.jsx` (6-stellig, Geräteauswahl), `RecoveryCodesView.jsx`, `RecoveryForm.jsx`. `AdminMfaScreen` nutzt sie weiter, das Verhalten bleibt gleich.
- **`useAuth`:** Nach Session-Restore und nach jedem Login zuerst `getAuthenticatorAssuranceLevel()`. `currentLevel === 'aal1' && nextLevel === 'aal2'` → `mfaGate = 'required'`, **kein** Profil-Laden. Erst nach erfolgreicher Verifikation bzw. bei `aal2` oder ohne Faktor das Profil laden. Ein leeres Profil bei `mfaGate === 'required'` führt **nie** ins Onboarding. Export `refreshMfa()`.
- **`ProtectedRoute`:** `mfaGate === 'required'` → `MfaChallengeScreen` (Text 5.5, Link „Wiederherstellungscode verwenden“ → `RecoveryForm`; nach Erfolg `supabase.auth.refreshSession()`, `refreshMfa()`, Hinweis „Dein zweiter Faktor wurde entfernt …“ mit Link zum Einrichten).
- **Globaler Fehlerpfad:** Jede Antwort `403 mfa_required` (Functions) bzw. `42501 mfa_required` (RPC) → `refreshMfa()`.
- **`ProfileScreen` → `SecurityCard`:** ohne Faktor „Konto zusätzlich schützen“ (5.5) → `MfaEnrollFlow` → nach Verifikation `mfa-recovery` `codes:generate { afterEnroll: true }` → `RecoveryCodesView` (Kopieren, „Ich habe sie gesichert“). Mit Faktor: Geräteliste, „Weiteres Gerät hinzufügen“, „Neue Wiederherstellungscodes“, „Zweiten Faktor entfernen“ (Bestätigungs-Sheet → `disable`).
- `src/lib/functions.js` für alle Aufrufe; kein Logging von QR, Schlüssel, Codes.

### ⛔ STOPP J-C6

> 👤 **Jerome**, genau in dieser Reihenfolge:
> 1. `supabase secrets set MFA_CODE_PEPPER=<langer Zufallswert>`; diesen Wert zusätzlich offline sichern (ohne ihn sind bestehende Wiederherstellungscodes wertlos).
> 2. Branch mergen, Vercel-Deploy abwarten (Frontend mit Code-Abfrage und Profil-Karte).
> 3. Functions deployen: **alle** (wegen `requireUser`) plus `mfa-recovery`.
> 4. Backup, dann `supabase db push` (MFA-Policies, Codes-Tabelle) und `notify pgrst, 'reload schema';`.
> 5. Test mit **deinem** Konto: abmelden → anmelden → Code-Abfrage → App lädt normal. Im Profil „Neue Wiederherstellungscodes“ erzeugen und sicher ablegen.
> 6. Test mit **Testkonto A**: einrichten → Codes sichern → abmelden → anmelden mit Code → abmelden → anmelden mit Wiederherstellungscode → Faktor weg, Mail kam → neu einrichten → entfernen.
> 7. **Löschtest und Export erneut** mit einem Testkonto **mit** Faktor: `npm run security:deletion-test` + `deletion-check.sql` überall 0 (Claude Code ergänzt `mfa_recovery_codes` in der Prüfung, falls sie nicht automatisch über `user_id` erfasst wird; `auth.mfa_factors` ist schon drin), Export enthält Faktoren ohne Geheimnisse.

---

## 8. Abschluss

1. `npm run security:test` mit allen neuen Prüfungen (Abschnitt 9); `ATTACK_TEST_MFA=1` einmal vollständig.
2. `ARCHITECTURE.md`:
   - Kopfzeile „Stand“ um Paket C ergänzen
   - Abschn. 2: neue Dateien (`scripts/security/*`, `src/lib/functions.js`, `src/components/mfa/*`, Functions `security-monitor`, `admin-security`, `export-my-data`, `mfa-recovery`, `_shared/mailer.ts`, `_shared/monitorRules.ts`, `_shared/cors.ts`), Migrationen mit echten Nummern
   - Abschn. 3: `ProtectedRoute` mit Code-Abfrage
   - Abschn. 4: `useAuth` mit `mfaGate`, Profil-Abschnitt Sicherheit und Datenexport, Onboarding 18+, Spracheingabe-Hinweis
   - Abschn. 5: neue Functions, `requireUser(opts)`, Region-Header
   - Abschn. 6: `security_alerts`, `mfa_recovery_codes`, `age_confirmed_at`, `consent_ip` entfernt, `mfa_satisfied()`, `confirm_age()`, `security_log_counts()`, Cron-Jobs, RLS-Tabelle mit MFA-Policy
   - Abschn. 10: Monitoring, Mailkanal, Notfallplan, MFA für Nutzer
   - Abschn. 11: `postbuild`-Prüfung, `security:secrets`, `share:zip`, neue Secrets
3. `CLAUDE.md`: Log-Codes als Schnittstelle zu S-22; neue Tabellen mit Personenbezug → Export, Löschtest, Frist; neue Client-RPCs mit `mfa_satisfied()`-Prüfung; neue Client-Tabellen mit `mfa_required`-Policy; ZIPs nur über `share:zip`.

### ⛔ STOPP J-C7: Abnahme

> 👤 **Jerome:** Angriffstest alle PASS (inkl. MFA-Lauf), Löschtest 0, Probe-Mail und ein echter Alarm (z. B. absichtlich 6× falscher MFA-Code mit Testkonto A → nach dem nächsten Lauf Alarm `mfa_verify_failed`), Abschlussbericht lesen.

---

## 9. Erweiterung `attack-test.mjs`

| # | Prüfung | Erwartung |
|---|---|---|
| 27 | `export-my-data` als B | 200; jede Zeile gehört B (alle `user_id`/`conversation_id` ∈ B); keine Schlüssel `embedding`, `code_hash`; `conversation_context` nur als `vorhanden` |
| 28 | `export-my-data` ohne Token / mit anon-Key | 401 |
| 29 | `insert into user_feedback` mit `consent_given = false` | Fehler |
| 30 | `update profiles set age_confirmed_at = …` | `42501`; `rpc('confirm_age')` ok |
| 31 | `security-monitor` ohne Secret · `admin-security` als B · `select security_alerts` · `rpc('security_log_counts')` | 401 · 403 · 0 Zeilen/Fehler · Fehler |
| 32 | Antwort-Header `x-sb-edge-region` bei je einem Aufruf von `chat`, `pre-session-briefing`, `export-my-data` | `eu-central-1` |
| 33 | `select mfa_recovery_codes` · `mfa-recovery recover` ohne Token | Fehler · 401 |
| 34 | *(nur mit `ATTACK_TEST_MFA=1`)* B richtet TOTP ein (Code per `otplib`, devDependency), neue Anmeldung mit aal1 | `select conversations` = 0 Zeilen; `chat` → 403 `mfa_required`; `export-my-data` → 403; `rpc('confirm_age')` → Fehler |
| 35 | *(MFA)* `mfa-recovery recover` mit falschem Code | 400 `invalid_code` |
| 36 | *(MFA)* Challenge + Verify → aal2 | `select conversations` > 0; `chat` 200 |
| 37 | *(MFA)* `codes:generate` → `recover` mit einem Code | Faktoren = 0, derselbe Code erneut → 400 |
| 38 | *(MFA, `finally`)* Aufräumen: Faktoren und Codes von B entfernen | B ohne Faktor, unabhängig vom Testergebnis |

Ausgaberegeln wie bisher: nur Zähler, Status, Codes. Den TOTP-Schlüssel und die Wiederherstellungscodes hält das Skript nur im Speicher und gibt sie nie aus.

---

## 10. Abschlussbericht (Pflicht)

`docs/security/paket-c-abschlussbericht.md` **und** Ausgabe im Chat:

```markdown
# Security-Paket C – Abschlussbericht

## 1. Status je Maßnahme
| ID | Status | Was umgesetzt wurde | Abweichung + Grund |
|---|---|---|---|
| S-05 (Code) | | | |
| S-09 | | | |
| S-22 | | | Mailkanal: SMTP 465 funktioniert ja/nein |
| S-11 | | | |
| S-16 | | | |
| S-06b | | | |

## 2. Befunde aus Phase 0
## 3. Migrationen (034–036 bzw. tatsächliche Nummern) und geänderte Dateien
## 4. Tests (Angriffstest inkl. MFA-Lauf, Löschtest mit Faktor, Probe-Mail, Export-Abdeckung je Tabelle)
## 5. Vorschläge für R-2 (Sätze für die Datenschutzerklärung: Region, Altersgrenze, Spracheingabe, Feedback, Export, MFA, Mail-Absender)
## 6. Offene Aufgaben für Jerome
- [ ] Gefundene Secrets rotiert (falls vorhanden)
- [ ] Notfallplan freigegeben und offline abgelegt
- [ ] MFA_CODE_PEPPER offline gesichert
- [ ] One.com als Auftragsverarbeiter für Alarm- und Kontomails in R-3 aufnehmen
- [ ] …
## 7. Offene Fragen
```

---

## 11. Definition of Done für Paket C

- [ ] Secret-Scan über die ganze Historie läuft und gibt nie Werte aus; der Build bricht bei Schlüsseln oder Nicht-anon-JWTs ab; ZIPs entstehen nur aus eingecheckten Dateien.
- [ ] Alle Function-Aufrufe laufen nachweisbar in `eu-central-1`.
- [ ] `security-monitor` läuft stündlich, meldet Schwellen mit Cooldown, schickt montags eine Wochenübersicht (nur Zähler); der Admin-Tab „Sicherheit“ zeigt beides; der Notfallplan ist freigegeben.
- [ ] Feedback nur mit Einwilligung (auch in der DB erzwungen); 18+ für neue und bestehende Konten; Hinweis zur Spracheingabe; `consent_ip` entfernt.
- [ ] Selbstauskunft liefert vollständig alle eigenen Daten (inkl. Coach-Notizen), keine Daten Dritter, rate-limitiert, mit Bestätigungsmail.
- [ ] MFA für Nutzer: freiwillig im Profil, durchgesetzt in App, Functions und RLS; Wiederherstellungscodes funktionieren genau einmal; jede Änderung erzeugt Mail und Log-Code.
- [ ] Angriffstest #27–38 PASS; Löschtest mit Faktor überall 0.
- [ ] `ARCHITECTURE.md`, `CLAUDE.md` aktualisiert; Abschlussbericht liegt vor.
