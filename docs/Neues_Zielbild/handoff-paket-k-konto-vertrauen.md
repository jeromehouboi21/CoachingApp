# Handoff: Paket K „Konto & Vertrauen“ (Passwort, Sicherheitsseite, neuer Einstieg, Konto löschen)

> **Für:** Claude Code · **Von:** Jerome (vorbereitet mit Claude) · **Stand:** 19.11.2026, abends · **Version:** v1
> **Grundlage:** `friedensstifter-konto-vertrauen-konzept-v1.md` (Konzept; **zuerst lesen**, Texte und Wireframes stehen dort), `ARCHITECTURE.md`, `CLAUDE.md`, Handoff Paket C v2 (für Abhängigkeiten)
> **Ziel:** Nutzer können ihr Passwort ändern, sehen ehrlich, wie ihre Daten geschützt sind, steigen über einen kürzeren Einstieg mit Einwilligung v2.0 ein und können ihr Konto sauber löschen.
>
> | Welle | Inhalt | Konzept | Startbar |
> |---|---|---|---|
> | **W1** | Passwort ändern, vergessen, festlegen | Abschn. 5 | **sofort**, auch parallel zu Paket C |
> | **W2** | Sicherheitsseite, Baustein „Warum sich die App etwas merkt“, Profil-Gliederung | Abschn. 3, 4, 7 | **sofort** |
> | **W3** | Neuer Einstieg (3 Screens + Konto), Einwilligung v2.0, Re-Consent (= R-1) | Abschn. 2 | erst nach **C-3** gemergt **und** freigegebenem Text (Anwalt) |
> | **W4** | Konto löschen verbessern | Abschn. 6 | erst nach **Paket C komplett** (C-2 Mail, C-4 Export, C-5 aal2) |
>
> Die Entscheidungen heißen K-1 bis K-8 (wie im Konzept), die Wellen W1 bis W4.

---

## Entscheidungen (von Jerome vor dem Start eingetragen)

> Leere Felder = Empfehlung aus dem Konzept, Abschnitt 9. **Claude Code trifft keine dieser Entscheidungen selbst.**

| # | Frage | Empfehlung | Jeromes Entscheidung |
|---|---|---|---|
| K-1 | Aufbau des Einstiegs | 3 Screens + Konto | |
| K-2 | Coaching-Vereinbarung im Einstieg | Kurzfassung (4 Punkte) + „Ganze Vereinbarung lesen“ | |
| K-3 | Häkchen „Datenschutzerklärung zustimmen“ | entfällt, nur Link | |
| K-4 | Wer nicht zustimmt | freundlicher Ausweg ohne App-Nutzung | |
| K-5 | Passwort ändern absichern | aktuelles Passwort | |
| K-6 | Löschbestätigung | „LÖSCHEN“ tippen, mit Faktor zusätzlich aal2 | |
| K-7 | Sicherheitsseite auch auf der Website | ja, erst nach R-1 und R-3 | |
| K-8 | Bestandsnutzer und Einwilligung v2.0 | einmaliges Sheet beim nächsten Login | |

---

## 0. Spielregeln für Claude Code

Alle Regeln aus den Paketen A, B und C gelten weiter. Besonders wichtig:

1. **Eine Welle zur Zeit**, jede auf einem eigenen Branch `konto/paket-k-<welle>` **von aktuellem `main`**. Laufen W1/W2 parallel zu Paket C, gilt: nie zwei offene Branches, die dieselbe Datei ändern. Konflikt mit einer C-Welle → C hat Vorrang, K wartet.
2. **Migrationen:** Nur W3 braucht eine. Nimm die **nächste freie Nummer** zum Startzeitpunkt (erwartet: 037, nach Paket C). Nie eine Nummer unter einer eingespielten.
3. **Schutz-Trigger `protect_profile_privileges()`:** Vorlage ist immer die **neueste Fassung** im Migrationsordner (nach Paket C: 035). Nur die Spaltenliste ändern.
4. **Rechtstexte schreibt Claude Code nicht.** Texte aus dem Konzept werden als Entwurf übernommen und in `src/content/` gesammelt, damit Jerome sie an genau einer Stelle ersetzen kann. Die Datenschutzerklärung (`DatenschutzScreen`) bekommt keine Textänderung.
5. **Nur behaupten, was stimmt.** Jede Aussage auf der Sicherheitsseite (W2) wird gegen den Code geprüft, bevor sie `live` wird. Das Ergebnis steht im Bericht.
6. **Sprachprinzip 1.5** für alle UI-Texte: Du-Form, kein „müssen“, kein absolutes „immer“/„nie“, kein „können nicht“. Ausnahme: Rechtstexte in Jeromes Wortlaut.
7. **Stilles Scheitern vermeiden:** Kein Erfolgshinweis ohne bestätigten Erfolg. Fehler werden sichtbar und mit Log-Code (ohne Inhalte, ohne E-Mail-Adressen) geloggt.
8. **Neue Log-Codes** trägst du in `_shared/monitorRules.ts` ein, sobald es die Datei gibt (C-2). Davor im Bericht auflisten.
9. **Deploy-Lehre:** erst mergen bzw. `main` auschecken, dann `supabase db push` / `functions deploy`. Nach neuen RPCs `notify pgrst, 'reload schema';`. Keine Deploys, keine Secrets, keine Dashboard-Änderungen durch dich. Übergabe an jedem **⛔ STOPP**.

---

## 1. Fahrplan

| Schritt | Welle | Migration | Voraussetzung |
|---|---|---|---|
| 1 | **Phase 0** für W1 + W2 | – | J-K1 erledigt |
| 2 | **W1** Passwort | – | Dashboard-Einstellungen gesetzt (J-K1) |
| 3 | **W2** Sicherheitsseite | – | W1 gemergt |
| 4 | **Phase 0** für W3 + W4 | – | Paket C-3 gemergt |
| 5 | **W3** Einstieg + Einwilligung v2.0 | 037 (nächste freie) | C-3 gemergt, **Texte freigegeben** (J-K4) |
| 6 | **W4** Konto löschen | – | Paket C komplett gemergt |
| 7 | **Abschluss** | – | alles gemergt |

---

## 2. Phase 0: Bestandsaufnahme

Antworten mit Pfad und Zeile in `docs/konto/paket-k-discovery.md`.

### 2.1 Für W1 und W2 (sofort)

**Passwort:**
1. Login-Screen: Gibt es „Passwort vergessen“? Wohin führt er, welcher Aufruf (`resetPasswordForEmail`?) mit welchem `redirectTo`?
2. Gibt es eine Route, auf der nach dem Reset-Link ein neues Passwort gesetzt wird? Wie reagiert `useAuth` auf das Event `PASSWORD_RECOVERY`?
3. Welcher Auth-Flow ist im Supabase-Client eingestellt (`flowType: 'pkce'` oder implizit)? Wo wird ein `code` aus der URL ausgetauscht (Magic Link)?
4. Gibt es irgendwo im Profil schon „Passwort ändern“?
5. `ProtectedRoute` / Redirect-Logik: Was passiert, wenn eine eingeloggte Person eine öffentliche Route aufruft (z. B. `/datenschutz`)?

**Sicherheitsseite (Prüfung jeder Aussage aus Konzept 4.2):**
6. Für jede Zeile mit Status `live` im Konzept: Belegstelle im Code oder in der Konfiguration (Datei + Zeile bzw. Migration). Mindestens: RLS + `requireUser` (S-02/S-03), Angriffstest vorhanden, Lernbasis-Opt-in (S-13), Admin-MFA (S-06), Region der DB, CSP ohne Fremd-Origins (`vercel.json`), lokale Schriften, HSTS, Rate-Limits (Migration 029), Löschtest, Fristen aus `apply_retention` (genaue Werte), Log-Löschjob 30 Tage.
7. Gibt es irgendeinen Analyse-, Tracking- oder Fehlerdienst im Frontend (z. B. Sentry, Vercel Analytics, Plausible)? Die Aussage „kein Tracking“ hängt daran.
8. Welche Drittanbieter bekommen heute Inhalte? (Anthropic, OpenAI-Embeddings, Mistral, falls Spracheingabe schon live ist.)
9. Wo liegt „Wie es funktioniert“ (Screen 7.8), und wie ist Block 3 „Dein Raum gehört dir“ aufgebaut?
10. `ProfileScreen`: aktuelle Einträge und Reihenfolge. Ist die Kreislauf-Umstellung (Profil hinter Avatar) schon umgesetzt?

### 2.2 Für W3 und W4 (nach C-3)

11. Onboarding: alle Dateien und Routen (Step 1–3, 3b, `Step4Auth`, Screen C), Zustandshaltung zwischen den Schritten, wo der Anzeigename erfasst wird, wie die Einladungscode-Prüfung eingebunden ist.
12. `handle_new_user`: aktuelle Fassung (nach C-3). Welche Metadaten liest sie heute (`age_confirmed`, …)? Werden `consent_given_at`, `consent_version`, `coaching_agreement_accepted_at`, `coaching_agreement_version` vom Server oder vom Client geschrieben? Stehen sie im Schutz-Trigger?
13. `checkConsent()`: wo aufgerufen, welche Versionen werden verglichen, was zeigt das Modal heute?
14. Konto löschen: Datei des Modals, Aufruf von `delete-account`, Fehlerbehandlung im Frontend. Reihenfolge der Schritte in der Function, wo `delete_incomplete` / `auth_delete_failed` geloggt werden.
15. `experience_patterns.source_user_id`: `ON DELETE CASCADE` oder `SET NULL`? (Der Lösch-Text richtet sich danach.)
16. Ist `export-my-data` (C-4) gemergt, und wie wird das Export-Sheet geöffnet (Komponente, Props)?

---

## ⛔ STOPP J-K1

> 👤 **Jerome:**
> 1. Dieses Dokument und das Konzept nach `docs/konto/` legen.
> 2. Entscheidungen K-1 bis K-8 eintragen (leer = Empfehlung).
> 3. **Supabase Dashboard → Authentication** (Bezeichnungen können leicht abweichen):
>    - Passwort-Einstellungen: **„Require current password when updating“** einschalten. Mindestlänge **12**.
>    - URL-Konfiguration: `https://app.friedensstifter.coach/passwort-neu` als erlaubte Redirect-URL eintragen.
>    - E-Mail-Vorlagen: **„Reset password“** auf Deutsch prüfen (Text unten in 3.4).
>    - **Security notifications** (laut Supabase-Changelog Feature Preview: Profil-Avatar → Feature previews → „Security notification templates“): „Password changed“ aktivieren, deutschen Text aus 3.4 eintragen. Ist die Vorschau nicht verfügbar, im Bericht vermerken; die Mail kommt dann später über den Mailkanal aus C-2.
> 4. Bestätigen, dass der eigene SMTP-Absender für Auth-Mails eingerichtet ist (sonst kommen Reset-Mails nicht an).

---

## 3. Welle W1: Passwort ändern, vergessen, festlegen

### 3.1 Abweichung vom Konzept (bewusst vereinfacht)

Das Konzept sieht für Konten ohne Passwort einen eigenen Eintrag „Passwort festlegen“ vor. Ob ein Konto ein Passwort hat, lässt sich im Client nicht sauber erkennen, und eine eigene RPC dafür wäre eine Migration mitten in Paket C. Deshalb **ein** Profil-Eintrag „Passwort“ mit Formular A und darunter dem Link „Noch kein Passwort oder vergessen?“, der Weg B auslöst. Für Nutzer ohne Passwort ist das derselbe Effekt.

### 3.2 Neue Dateien

```
src/lib/passwordPolicy.js          Mindestlänge, Prüfung, Fehlertexte
src/screens/PasswordChangeScreen.jsx   Route /profil/passwort (geschützt)
src/screens/PasswordResetScreen.jsx    Route /passwort-neu (Recovery-Sitzung)
src/components/auth/ForgotPasswordForm.jsx   wiederverwendet auf Login und im Profil
```

### 3.3 Logik

**`src/lib/passwordPolicy.js`**
```js
export const PASSWORD_MIN_LENGTH = 12;

export function checkNewPassword(pw, repeat) {
  if (!pw || pw.length < PASSWORD_MIN_LENGTH) return 'too_short';
  if (pw !== repeat) return 'mismatch';
  return null;
}

// Fehlertexte nach Sprachprinzip; Supabase-Codes in Phase 0 / beim Testen verifizieren
export const PASSWORD_MESSAGES = {
  too_short: `Das neue Passwort braucht mindestens ${PASSWORD_MIN_LENGTH} Zeichen.`,
  mismatch: 'Die beiden neuen Passwörter stimmen nicht überein.',
  same_password: 'Das neue Passwort ist dasselbe wie das bisherige.',
  weak_password: 'Dieses Passwort ist zu leicht zu erraten. Ein Satz, den du dir merken kannst, funktioniert gut.',
  current_password_wrong: 'Das aktuelle Passwort stimmt nicht.',
  rate_limited: 'Das waren gerade viele Versuche. Probier es in ein paar Minuten noch einmal.',
  generic: 'Das hat gerade nicht geklappt. Versuch es bitte später noch einmal.',
};
```

**Weg A – Passwort ändern** (`PasswordChangeScreen`, Text und Layout: Konzept 5.2 A)
```js
// NACHHER (Kern)
async function onSubmit({ current, next, repeat }) {
  const local = checkNewPassword(next, repeat);
  if (local) return setError(PASSWORD_MESSAGES[local]);

  const { error } = await supabase.auth.updateUser({ password: next, current_password: current });
  if (error) {
    logger.warn('password_change_failed', { code: error.code ?? 'unknown' });  // nie Passwörter, nie E-Mail
    return setError(PASSWORD_MESSAGES[mapAuthError(error)] ?? PASSWORD_MESSAGES.generic);
  }

  const { error: soErr } = await supabase.auth.signOut({ scope: 'others' });
  if (soErr) logger.warn('signout_others_failed', { code: soErr.code ?? 'unknown' });
  logger.info('password_changed');
  setDone(true);   // Text: „Dein Passwort ist geändert. Auf anderen Geräten bist du jetzt abgemeldet.“
}
```
- `mapAuthError` ordnet die echten Supabase-Fehlercodes den Schlüsseln oben zu. Welcher Code bei falschem aktuellem Passwort kommt, beim Testen mit Testkonto A ermitteln und im Bericht notieren. Unbekannte Codes → `generic`.
- Schlägt `signOut({ scope: 'others' })` fehl, bleibt die Passwortänderung gültig. Erfolgstext dann ohne den Satz zu anderen Geräten, plus Hinweis „Melde dich auf anderen Geräten bitte einmal neu an.“
- Felder mit `autocomplete="current-password"` bzw. `"new-password"`, Sichtbar-Schalter (👁) je Feld.
- Unter dem Formular: `ForgotPasswordForm` eingeklappt hinter „Noch kein Passwort oder vergessen? Wir schicken dir einen Link ›“, mit der E-Mail des Kontos vorbelegt (nicht änderbar).

**Weg B – Passwort vergessen** (`ForgotPasswordForm`, auf dem Login-Screen und im Profil)
```js
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/passwort-neu`,
});
if (error && isRateLimit(error)) return setError(PASSWORD_MESSAGES.rate_limited);
if (error) logger.warn('password_reset_request_failed', { code: error.code ?? 'unknown' });
// IMMER derselbe Text, egal ob es das Konto gibt (kein Rückschluss auf Nutzer der App):
setInfo('Wenn es ein Konto mit dieser Adresse gibt, haben wir dir einen Link geschickt. Schau auch im Spam-Ordner nach.');
```

**`/passwort-neu`** (`PasswordResetScreen`)
- Erreichbar nur mit einer Recovery-Sitzung: Event `PASSWORD_RECOVERY` (impliziter Flow) bzw. nach Code-Austausch (PKCE). Die Erkennung baust du nach dem Ergebnis aus Phase 0, Frage 3.
- `useAuth` darf bei einer Recovery-Sitzung **nicht** automatisch auf Heute/Home weiterleiten. Merker `recoveryMode` im Auth-Kontext, solange die Seite offen ist.
- Ohne gültige Sitzung: „Der Link ist abgelaufen oder wurde schon benutzt.“ + `ForgotPasswordForm`.
- Formular: neues Passwort + Wiederholung → `updateUser({ password })` (ohne `current_password`, die Recovery-Sitzung ist der Nachweis; prüfen, ob Supabase das mit „Require current password“ zulässt, Ergebnis im Bericht) → `signOut({ scope: 'others' })` → Hinweis → weiter in die App.
- **Ab C-5:** Hat das Konto einen zweiten Faktor, liegt `/passwort-neu` hinter der Code-Abfrage (`mfaGate`). Erst Code, dann neues Passwort.

### 3.4 Texte für das Dashboard (Jerome trägt sie ein)

**Reset-Mail**
```
Betreff: Neues Passwort für Friedensstifter

Hallo,
du hast ein neues Passwort für dein Friedensstifter-Konto angefordert.
Mit diesem Link kannst du es festlegen: {{ .ConfirmationURL }}
Der Link funktioniert einmal und ist nur kurze Zeit gültig.

Warst du das nicht? Dann kannst du diese Mail einfach ignorieren.
Dein bisheriges Passwort bleibt bestehen.

Jerome · friedensstifter.coach
```

**Passwort geändert**
```
Betreff: Dein Passwort wurde geändert

Hallo,
das Passwort für dein Friedensstifter-Konto wurde gerade geändert.

Warst du das nicht? Antworte auf diese Mail, dann schauen wir gemeinsam darauf.

Jerome · friedensstifter.coach
```

### 3.5 Profil und Routing

- `ProfileScreen`: Eintrag „Passwort“ → `/profil/passwort`. Einordnung nach W2 (Abschnitt „Konto & Sicherheit“); bis W2 gemergt ist, direkt über „Datenschutzerklärung“.
- Routen: `/profil/passwort` geschützt, `/passwort-neu` öffentlich mit eigener Sitzungsprüfung.
- Login-Screen: Link „Passwort vergessen?“ unter dem Passwortfeld (falls Phase 0 zeigt, dass er fehlt oder woanders hinführt).

### 3.6 Angriffstest-Erweiterung (W1)

| # | Prüfung | Erwartung |
|---|---|---|
| K1 | B: `updateUser({ password })` **ohne** `current_password` | Fehler (belegt, dass die Dashboard-Einstellung greift) |
| K2 | B: `updateUser({ password, current_password: <falsch> })` | Fehler |
| K3 | `resetPasswordForEmail` für eine nicht existierende Adresse | kein Unterschied in Status und Antwort zu einer existierenden (nur vergleichen, nichts ausgeben) |

Testkonto B bekommt sein Passwort am Ende zurück (`finally`). Ausgaben wie immer nur Status und Codes.

### ⛔ STOPP J-K2

> 👤 **Jerome:** Mergen, Vercel-Deploy abwarten. Tests mit **Testkonto A**:
> (a) Profil → Passwort: falsches aktuelles Passwort → Fehler sichtbar; richtiges → Erfolg; auf einem zweiten Browser ist A danach abgemeldet; Mail „Passwort geändert“ kam (falls Vorlage aktiv).
> (b) Abmelden → Login → „Passwort vergessen?“ → Mail → Link → neues Passwort → in der App.
> (c) Den Link aus (b) ein zweites Mal öffnen → „Der Link ist abgelaufen …“.
> (d) „Passwort vergessen“ mit einer Fantasie-Adresse → gleicher Text wie bei (b).
> (e) `npm run security:test` → K1–K3 PASS.

---

## 4. Welle W2: Sicherheitsseite, „Warum speichern“, Profil-Gliederung

### 4.1 Inhaltsdatei `src/content/securityMeasures.js`

Alle Aussagen der Sicherheitsseite an einer Stelle. Angezeigt werden **nur** Einträge mit `status: 'live'`.

```js
// Jede Aussage hat eine Roadmap-ID und einen Beleg (für Jerome und den Abschlussbericht).
// status: 'live'      → wird angezeigt
//         'geplant'   → wird NICHT angezeigt; auf 'live' setzen, sobald die Welle gemergt und abgenommen ist
//         'text_offen'→ wird NICHT angezeigt; Jerome liefert den Text (Platzhalter in [eckigen Klammern])
export const SECURITY_PAGE_AS_OF = '2026-11';   // bei jeder Änderung hochsetzen

export const SECURITY_GROUPS = [
  { key: 'zugriff',  title: 'Wer deine Daten sehen kann' },
  { key: 'ort',      title: 'Wo deine Daten liegen' },
  { key: 'zugang',   title: 'Wie dein Zugang geschützt ist' },
  { key: 'gehen',    title: 'Was mit deinen Daten passiert, wenn du gehst' },
];

export const SECURITY_MEASURES = [
  { id: 'S-02/S-03/S-12', group: 'zugriff', status: 'live',
    text: 'In der App siehst nur du deine Gespräche und Erkenntnisse. Jede Anfrage wird auf dem Server geprüft, nicht nur in der App.',
    evidence: '<Phase 0>' },
  // … alle Zeilen aus Konzept 4.2 in derselben Form, Status wie im Konzept
  // 'Als Betreiber habe ich technischen Zugang …'      → text_offen (R-1)
  // 'Für die Antworten … an Anthropic … [Speicherfrist]' → text_offen (R-3)
  // 'Spracheingabe … Mistral'                            → geplant (bis Spracheingabe live)
  // S-09, S-06b, S-22, S-16, 'Passwort geändert → Mail'  → geplant
  // 'Passwort geändert → Mail'                           → live, wenn J-K2 (a) bestätigt
];

// Dieser Block erscheint immer (Konzept 4.2, „Was du wissen solltest“)
export const SECURITY_HONESTY = [
  { status: 'live', text: 'Deine Gespräche sind nicht Ende-zu-Ende-verschlüsselt. Der Begleiter liest deine Worte, um dir antworten zu können. Deshalb liegen sie auf dem Server lesbar vor, geschützt durch die Maßnahmen oben.' },
  { status: 'geplant', text: 'Kein Online-Dienst ist völlig ohne Risiko. Ich arbeite daran, dieses Risiko so klein wie möglich zu halten, und lasse die App vor dem offiziellen Start zusätzlich von außen prüfen.' }, // erst mit S-21
  { status: 'live', text: 'Fragen zur Sicherheit? Schreib mir: hallo@friedensstifter.coach' },
];
```

- „Kein Tracking“ nur `live`, wenn Phase 0, Frage 7 keinen Dienst gefunden hat.
- Die Fristen-Zeile (S-15) bekommt die echten Werte aus `apply_retention`. Jerome bestätigt die Formulierung in J-K3; bis dahin `text_offen`.
- Aussagen, deren Beleg Phase 0 **nicht** findet, bekommen `status: 'text_offen'` und eine Zeile im Bericht. Nicht stillschweigend weglassen.

**Build-Prüfung** (in das bestehende `postbuild`-Skript aus C-1 einhängen, sonst eigenes `scripts/check-content.mjs`):
- Kein Eintrag mit `status: 'live'` enthält `[` oder `<` (Platzhalter).
- Jeder `live`-Eintrag hat ein nicht leeres `evidence`.
- Verstoß → Exit-Code 1.

### 4.2 Screen „Wie wir deine Daten schützen“

- **Neue Route `/sicherheit`, öffentlich** (ohne Login erreichbar, ohne Datenbankaufrufe), damit Einstieg, Website und Datenschutzerklärung darauf verlinken können. Eingeloggte Nutzer werden **nicht** umgeleitet (Phase 0, Frage 5 beachten).
- Komponente `SecurityInfoScreen.jsx` rendert: Titel, „Stand: <Monat Jahr>“ aus `SECURITY_PAGE_AS_OF`, Einleitung mit Jeromes Kürzel (Konzept 4.2), dann je Gruppe die `live`-Einträge als ruhige Liste (kein Häkchen-Feuerwerk, keine Wertungsfarben), am Ende der Block „Was du wissen solltest“.
- Zusätzlich als Sheet-Variante `SecurityInfoSheet` (gleiche Komponente im Sheet), für den Einstieg in W3.
- Footer: Links „Datenschutzerklärung“, „Impressum“.

### 4.3 Baustein „Warum sich die App etwas merkt“

- `src/content/whyMemory.js`: Text aus Konzept 3.2, **Variante ohne „musst“** („Du fängst nicht jedes Mal von vorn an.“), und die Tabelle aus 3.3. In der Tabelle zeigt die Spalte „Wo du es siehst“ bis C-4 „auf Anfrage bei Jerome“ statt „im Datenexport“. Steuerung über eine Konstante `EXPORT_AVAILABLE` (nach C-4 auf `true`).
- `src/components/WhyMemoryBlock.jsx`: rendert Text + vier Punkte + Link „Was genau gespeichert wird ›“ (Sheet mit der Tabelle).
- Einbau jetzt: in „Wie es funktioniert“ als Ersatz bzw. Ergänzung von Block 3 „Dein Raum gehört dir“, darunter Link „Wie wir deine Daten schützen ›“ → `/sicherheit`. In W3 wird derselbe Block Screen 2 des Einstiegs.

### 4.4 Profil-Gliederung (Konzept 7)

`ProfileScreen` nach Konzept 7 gliedern: „Dein Begleiter“, „Konto & Sicherheit“, „Rechtliches“, Abmelden, Trennlinie, „Konto löschen“.
- Einträge, deren Funktion noch nicht existiert (Konto zusätzlich schützen, Meine Daten herunterladen), werden **nur gerendert, wenn die Komponente vorhanden ist** (z. B. Feature-Konstante). Keine toten Links.
- „Coaching-Vereinbarung“ unter Rechtliches: zeigt den bestehenden Vertragstext (aus Step 3b) lesend an.
- Ist die Kreislauf-Umstellung (Profil hinter Avatar) noch nicht gemacht, nur die Gliederung umsetzen, nicht die Navigation.
- „Datenschutzerklärung“ (`DatenschutzScreen`): unten **nur einen Link** „Wie wir deine Daten schützen ›“ ergänzen, keine Textänderung.

### ⛔ STOPP J-K3

> 👤 **Jerome:**
> 1. `src/content/securityMeasures.js` durchgehen: Stimmt jede `live`-Aussage? Belege im Bericht ansehen. Fristen-Formulierung bestätigen.
> 2. Mergen. `/sicherheit` ausgeloggt und eingeloggt öffnen, auf dem Handy lesen. Wirkt es ehrlich und ruhig?
> 3. „Wie es funktioniert“ und Profil-Gliederung prüfen.
> 4. Ab jetzt bei jedem Abschluss einer C-Welle: Claude Code setzt den passenden Eintrag auf `live` (Punkt im jeweiligen Bericht).

---

## 5. Welle W3: Neuer Einstieg und Einwilligung v2.0 (= R-1)

> **Eingangsbedingungen, sonst nicht starten:**
> - C-3 ist gemergt (18+-Häkchen in `Step4Auth`, `age_confirmed_at`, `handle_new_user` liest Metadaten).
> - Jerome hat die Texte freigegeben: Kurzfassung der Vereinbarung (Konzept 2.4), Einwilligungstext Art. 9, Satz zum Betreiberzugang, voller Vereinbarungstext v2.0 (J-K4). Bis dahin baust du mit den Konzept-Entwürfen, aber der Produktions-Build ist gesperrt (5.4).

### 5.1 Neuer Ablauf

```
Landing ── „Los geht's“ ──▶ /start/1  Was dich hier erwartet      (Konzept 2.2)
                            /start/2  Warum sich die App etwas merkt (WhyMemoryBlock + „Wie wir deine Daten schützen ›“ als Sheet)
                            /start/3  Deine Zustimmung              (Konzept 2.4; „Lieber nicht“ → Sheet)
                            /start/4  Dein Zugang                   (Step4Auth, umgebaut; Konzept 2.5)
                              └─▶ „Bestätige deine E-Mail“ (wie heute) ─▶ Login ─▶ Heute/Home
```
- Punkteanzeige „Schritt 1 von 3“ auf 1–3, nicht auf 4.
- „Ich habe schon ein Konto → Anmelden“ auf Screen 1.
- **Entfällt:** Steps 1–3 (alt), Step 3b als eigener Schritt (Text lebt als „Ganze Vereinbarung lesen“ weiter), Häkchen „Datenschutzerklärung“, Erster Empfangs-Screen (Screen C). Alte Onboarding-Routen leiten auf `/start/1` um.
- Gibt es Heute Zustand A (Kreislauf) noch nicht, landet der Nutzer nach dem ersten Login wie bisher auf Home.

### 5.2 Zustimmung (Screen 3)

- Zwei Häkchen, nicht vorausgewählt, getrennt (Konzept 2.4). Button „Zustimmen und weiter“ erst mit beiden aktiv.
- Die Zustimmung lebt **nur im Zustand des Onboardings** (React-State bzw. Kontext, kein `localStorage`). Neu laden → zurück auf `/start/3`, wenn jemand direkt `/start/4` aufruft.
- „Ganze Vereinbarung lesen ›“ öffnet den vollen Text v2.0 im Sheet. „Datenschutzerklärung ›“ öffnet `/datenschutz` im Sheet bzw. neuen Tab.
- **„Lieber nicht“** → Sheet nach Konzept 2.4 mit drei externen Links (`target="_blank" rel="noopener noreferrer"`). Kein Konto wird angelegt, nichts gespeichert, kein Log mit Personenbezug (höchstens `onboarding_declined` ohne Daten).

### 5.3 Konto (Screen 4) und Server

**Frontend:** `Step4Auth` umbauen: E-Mail, Passwort (min. 12, Hinweis aus Konzept 2.5), 18+-Häkchen aus C-3 unverändert, Einladungscode eingeklappt. Das Datenschutz-Häkchen und das bisherige Art.-9-Häkchen entfallen hier (sie sind jetzt Screen 3).
```js
// NACHHER (Kern): Zustimmung reist mit der Registrierung, der Server setzt die Felder
await signUp(email, password, displayName, {
  ...meta,
  age_confirmed: true,
  consent_version: CONSENT_VERSION,            // '2.0'
  agreement_version: AGREEMENT_VERSION,        // '2.0'
  consent_art9: true,
  agreement_accepted: true,
});
```

**Migration `037_k_consent_v2.sql`** (nächste freie Nummer):
```sql
-- Paket K / R-1: Einwilligung v2.0, nur der Server setzt Zustimmungsfelder

-- 1. handle_new_user (Vorlage: Fassung aus 035, sonst unverändert) ergänzen:
--    wenn raw_user_meta_data->>'consent_art9' = 'true' und ->>'consent_version' = '2.0':
--        consent_given_at = now(), consent_version = '2.0'
--    wenn raw_user_meta_data->>'agreement_accepted' = 'true' und ->>'agreement_version' = '2.0':
--        coaching_agreement_accepted_at = now(), coaching_agreement_version = '2.0'
--    Andere Versionswerte werden ignoriert (Client darf keine beliebige Version setzen).

-- 2. Schutz-Trigger (Vorlage: neueste Fassung) – falls Phase 0 zeigt, dass die vier Spalten
--    noch vom Client beschreibbar sind: in die gesperrte Liste aufnehmen.

-- 3. Re-Consent für Bestandsnutzer
create or replace function public.accept_consent_v2()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not public.mfa_satisfied() then            -- aus C-5; existiert sie beim Start noch nicht: Zeile weglassen und im Bericht vermerken
    raise exception 'mfa_required' using errcode = '42501';
  end if;
  update public.profiles
     set consent_given_at = now(), consent_version = '2.0',
         coaching_agreement_accepted_at = now(), coaching_agreement_version = '2.0'
   where id = auth.uid();
end;
$$;
revoke all on function public.accept_consent_v2() from public, anon;
grant execute on function public.accept_consent_v2() to authenticated;
```

### 5.4 Texte und Freigabe-Sperre

- `src/content/legalTexts.js`: `CONSENT_VERSION = '2.0'`, `AGREEMENT_VERSION = '2.0'`, Kurzfassung (4 Punkte), voller Vereinbarungstext, Einwilligungstext Art. 9, Hinweis zum Widerruf. Dazu `LEGAL_TEXTS_APPROVED = false`.
- Build-Prüfung (gleiches Skript wie 4.1): Ist `VERCEL_ENV === 'production'` und `LEGAL_TEXTS_APPROVED !== true`, bricht der Build ab mit „Rechtstexte v2.0 nicht freigegeben“. Preview-Builds laufen durch. **Jerome** setzt `true`, nachdem er die finalen Texte eingetragen hat. Claude Code ändert diesen Wert nie.

### 5.5 Bestandsnutzer (Re-Consent, K-8)

- `checkConsent()`: aktuelle Version `'2.0'`. Ist `consent_version < '2.0'` oder `coaching_agreement_version < '2.0'` → Screen 3 als Vollbild-Sheet **vor** der App, Überschrift „Wir haben die Vereinbarung überarbeitet“, sonst wie Screen 3. „Zustimmen und weiter“ → `rpc('accept_consent_v2')` → Profil neu laden. Fehler sichtbar, kein Weiter ohne Erfolg.
- „Lieber nicht“ für Bestandsnutzer → Sheet: „Das ist in Ordnung. Ohne deine Zustimmung lässt sich der Begleiter nicht weiter nutzen. Du kannst vorher deine Daten herunterladen und dein Konto löschen.“ mit „Meine Daten herunterladen“ (falls C-4 da), „Konto löschen“ (bestehender Flow), „Abmelden“. Die App bleibt bis zur Zustimmung gesperrt, Profil-Löschweg und Export bleiben erreichbar.
- Reihenfolge der Sheets nach dem Login: MFA-Code (C-5) → 18+ (C-3) → Einwilligung v2.0.

### 5.6 Angriffstest-Erweiterung (W3)

| # | Prüfung | Erwartung |
|---|---|---|
| K4 | B: `update profiles set consent_version = '2.0'` bzw. `coaching_agreement_accepted_at` | `42501` |
| K5 | B: `rpc('accept_consent_v2')` | ok, Felder gesetzt (danach für B wieder auf Ausgangswert über service_role, `finally`) |
| K6 | anon: `rpc('accept_consent_v2')` | Fehler |
| K7 | Signup mit `consent_version: '9.9'` in den Metadaten (Testadresse, danach löschen) | `consent_version` ist nicht `'9.9'` |

### ⛔ STOPP J-K4

> 👤 **Jerome:**
> 1. Finale Texte (nach Anwalt) in `src/content/legalTexts.js` eintragen, `LEGAL_TEXTS_APPROVED = true` setzen, committen.
> 2. Mergen, Backup, `supabase db push`, `notify pgrst, 'reload schema';`.
> 3. Test mit neuer Adresse: Einstieg komplett durchlaufen; ohne Häkchen kein Weiter; „Lieber nicht“ legt kein Konto an; nach Registrierung in Supabase prüfen: `consent_version = '2.0'`, `coaching_agreement_version = '2.0'`, `age_confirmed_at` gesetzt.
> 4. Dein Konto: Re-Consent-Sheet erscheint einmal, danach nicht mehr.
> 5. `npm run security:test` → K4–K7 PASS.

---

## 6. Welle W4: Konto löschen verbessern

> **Eingangsbedingung:** Paket C komplett gemergt (Mailer aus C-2, Export aus C-4, `requireUser` mit aal2 aus C-5).

### 6.1 Function `delete-account`

Reihenfolge und Mail (Abweichung vom Konzept 6.2 Punkt 5: Die Mail geht **nach** erfolgreicher Löschung raus, nicht davor, damit nie eine Bestätigung für eine gescheiterte Löschung verschickt wird. Die Adresse wird dafür nur im Speicher der Function gehalten.)
```
requireUser (aal2 bei Faktor, aus C-5)
email = ctx.user.email                          // nur im Speicher
… bestehende Löschschritte unverändert …
Fehler in einem Schritt → log delete_incomplete { step } bzw. auth_delete_failed → 500 { code: 'delete_incomplete' }
Erfolg → sendMail(email, 'Dein Konto wurde gelöscht', TEXT) → Ergebnis nur als Code loggen (account_deleted_mail_ok | _failed)
       → 200 { success: true }
```
Mail-Text:
```
Hallo,
dein Konto bei Friedensstifter und alle dazugehörigen Daten wurden gelöscht.
Danke, dass du die App ausprobiert hast.

Warst du das nicht? Antworte auf diese Mail.

Jerome · friedensstifter.coach
```
Scheitert die Mail, bleibt die Löschung gültig (200). Kein erneuter Versuch, keine Speicherung der Adresse.

### 6.2 Frontend (Modal)

- Text nach Konzept 6.3. Die Zeile zur Lernbasis nur, wenn Phase 0, Frage 15 `CASCADE` ergibt; bei `SET NULL` stattdessen: „Deine Beiträge zur Lernbasis enthalten keine Namen und bleiben ohne Verbindung zu dir erhalten.“ (Jerome bestätigt in J-K5).
- Die Zeile zur Frist beim KI-Anbieter kommt aus `legalTexts.js` (`AI_PROVIDER_RETENTION_NOTE`). Ist sie leer, wird die Zeile nicht angezeigt. Den alten, ungeprüften 30-Tage-Satz entfernen.
- Link „Möchtest du vorher deine Daten herunterladen? ›“ öffnet das Export-Sheet aus C-4.
- „LÖSCHEN“-Eingabe bleibt (K-6).
- **Fehler:** Antwort ≠ 200 → **nicht** abmelden, Modal bleibt offen mit: „Dein Konto konnte nicht vollständig gelöscht werden. Ich bin informiert und kümmere mich darum. Du bekommst eine Mail, sobald alles gelöscht ist.“ (Der Alarm kommt über die Regel `delete_incomplete` aus C-2.)
- `403 mfa_required` → globaler Pfad aus C-5 (`refreshMfa()`).

### 6.3 Erreichbarkeit

- „Konto löschen“ bleibt letzter Eintrag im Profil (W2-Gliederung).
- Zusätzlich verlinkt aus `/sicherheit` (Gruppe „Was mit deinen Daten passiert, wenn du gehst“, nur eingeloggt sichtbar) und aus dem Re-Consent-Sheet (W3).

### ⛔ STOPP J-K5

> 👤 **Jerome:** Text zur Lernbasis und Anbieterfrist bestätigen bzw. eintragen. Mergen, `supabase functions deploy delete-account`. Test mit **Testkonto C** (mit und ohne zweiten Faktor): Export-Link funktioniert; Löschung → abgemeldet, Mail kam; `npm run security:deletion-test` + `deletion-check.sql` überall 0.

---

## 7. Abschluss

1. `npm run security:test` komplett (inkl. K1–K7).
2. `ARCHITECTURE.md`: neue Routen (`/profil/passwort`, `/passwort-neu`, `/sicherheit`, `/start/1–4`), neue Dateien (`src/content/*`, Screens, Komponenten), `recoveryMode` in `useAuth`, Einwilligung v2.0 (Server setzt Felder), `accept_consent_v2()`, Build-Prüfungen, `delete-account` mit Mail, Dashboard-Einstellungen (Require current password, Redirect-URL, Mailvorlagen).
3. `CLAUDE.md`: „Neue Sicherheitsaussagen nur über `securityMeasures.js` mit Beleg; nach jeder Security-Welle Status prüfen.“ · „Rechtstexte nur in `legalTexts.js`; `LEGAL_TEXTS_APPROVED` setzt nur Jerome.“
4. Design-Dokument-Hinweis im Bericht: Abschnitte 7.1 (Onboarding), 7.6 (Profil), 7.6b (Löschen), 7.8 (Wie es funktioniert) und Kreislauf-Konzept Abschnitt 7 sind zu aktualisieren (macht Jerome mit Claude).

### ⛔ STOPP J-K6: Abnahme

> 👤 **Jerome:** Angriffstest alle PASS, Löschtest 0, Einstieg einmal auf dem Handy komplett durchgespielt, Abschlussbericht gelesen.

---

## 8. Abschlussbericht (Pflicht)

`docs/konto/paket-k-abschlussbericht.md` **und** Ausgabe im Chat:

```markdown
# Paket K „Konto & Vertrauen“ – Abschlussbericht

## 1. Status je Welle
| Welle | Status | Was umgesetzt wurde | Abweichung + Grund |
|---|---|---|---|
| W1 Passwort | | | Fehlercode bei falschem aktuellem Passwort: … · Security-Notification aktiv ja/nein |
| W2 Sicherheitsseite | | | |
| W3 Einstieg + Einwilligung v2.0 | | | |
| W4 Konto löschen | | | |

## 2. Befunde aus Phase 0
## 3. Belege der Sicherheitsseite (je Eintrag: ID, Status, Beleg; Einträge ohne Beleg mit Grund)
## 4. Migration (tatsächliche Nummer) und geänderte Dateien
## 5. Tests (Angriffstest K1–K7, Löschtest, manuelle Abläufe)
## 6. Vorschläge für R-2 (Sätze für die Datenschutzerklärung: Passwort-Mails, Sicherheitsseite, Einwilligung v2.0, Löschmail)
## 7. Offene Aufgaben für Jerome
- [ ] Dashboard-Einstellungen aus J-K1 gesetzt
- [ ] Rechtstexte v2.0 freigegeben (`LEGAL_TEXTS_APPROVED`)
- [ ] Anbieterfrist (R-3) in `legalTexts.js` und `securityMeasures.js` eingetragen
- [ ] Website-Seite „Sicherheit“ (K-7) im Website-Projekt angestoßen
## 8. Offene Fragen
```

---

## 9. Definition of Done für Paket K

- [ ] Nutzer ändern ihr Passwort nur mit dem aktuellen Passwort (vom Auth-Server erzwungen), setzen über „vergessen“ ein neues (ohne Rückschluss, ob ein Konto existiert), andere Geräte werden abgemeldet, eine Mail informiert.
- [ ] `/sicherheit` ist öffentlich, zeigt nur belegte `live`-Aussagen mit Stand-Datum und den Ehrlichkeits-Block; der Build verhindert Platzhalter in `live`-Einträgen.
- [ ] „Warum sich die App etwas merkt“ steht in „Wie es funktioniert“ und als Screen 2 des Einstiegs.
- [ ] Einstieg mit 3 Screens + Konto; zwei getrennte Häkchen; Zustimmungsfelder setzt nur der Server; Bestandsnutzer bestätigen v2.0 einmal; Produktion nur mit freigegebenen Texten.
- [ ] Konto löschen: Export davor erreichbar, ehrlicher Text, Fehler sichtbar ohne Abmelden, Bestätigungsmail nur nach Erfolg; Löschtest überall 0.
- [ ] Angriffstest K1–K7 PASS; `ARCHITECTURE.md` und `CLAUDE.md` aktualisiert; Abschlussbericht liegt vor.

---

## Hinweis außerhalb von Paket K

Paket C, Welle C-3, beschreibt den Hinweis zur Spracheingabe noch für die Browser-Spracherkennung (Google/Apple). Entschieden ist Mistral (Voxtral) serverseitig. **Vor dem Start von C-3** den Text in Paket C 5.3 anpassen (Jerome mit Claude), sonst zeigt die App eine falsche Aussage.

---

*Handoff Paket K v1 · erstellt mit Claude für Jerome Houboi · friedensstifter.coach*
