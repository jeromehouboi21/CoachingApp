# Abgleich Rechtstexte ↔ Code (Paket K, W3 / R-1)

**Stand:** 20.11.2026 · **Grundlage:** `src/content/legalTexts.js` (Entwurf v2 von Jerome, 20.11.2026) gegen den Code auf `konto/paket-k-w3`
**Zweck:** Alles, was in den Rechtstexten steht, ist so auch in der App umgesetzt. Diese Liste zeigt, wo das schon stimmt und wo noch Arbeit ist.
**Hinweis:** Claude Code schreibt keine Rechtstexte (Paket K, Spielregel 4). Die Formulierungen in Abschnitt A sind **Vorschläge als Grundlage für Jerome und den Anwaltstermin**. Sie geben nur wieder, was der Code tatsächlich tut. Eine Rechtsberatung sind sie nicht.

Status: ☐ offen · ☑ erledigt

---

## A. Aussagen, die nicht zum Code passen

### ☐ A1 Supabase: Standort

**Steht da** (`DATA_RECIPIENTS`, Supabase): „Server in Frankfurt am Main (EU), Anbieter mit Sitz in den USA“

**Code:** Die Datenbank liegt in `eu-west-1` (Irland), das zeigt das Supabase-Dashboard (bestätigt am 20.11.2026). Die Edge Functions laufen seit S-09 fest in derselben Region (`x-region: eu-west-1`, `src/lib/functions.js`; Angriffstest #32).

**Vorschlag:**
```js
location: 'Rechenzentrum in Irland (EU), Anbieter mit Sitz in den USA',
```

---

### ☐ A2 Spracheingabe: Browser statt Mistral

**Steht da** (`DATA_RECIPIENTS`): Mistral AI, Frankreich, „erst aufnehmen, wenn die Spracheingabe live ist“

**Code:**
- Die Spracheingabe ist **schon live** (`src/hooks/useVoiceInput.js`, Mikrofon im Chat).
- Sie nutzt die eingebaute Spracherkennung des Browsers (`window.SpeechRecognition` / `webkitSpeechRecognition`, Sprache de-DE). Mistral wird nirgends aufgerufen.
- In Chrome und Edge verarbeitet die Aufnahme in der Regel **Google** auf eigenen Servern, in Safari **Apple**. Die App hat mit beiden keinen Vertrag. Die Verarbeitung läuft nach den Bedingungen des Browsers.

**Vorschlag** (ersetzt den Mistral-Eintrag):
```js
{
  name: 'Google oder Apple (über deinen Browser)',
  location: 'USA',
  purpose: 'Spracheingabe: Dein Browser wandelt gesprochene Sprache in Text um. In Chrome und Edge übernimmt das in der Regel Google, in Safari Apple.',
  data: 'Sprachaufnahme, nur solange du die Spracheingabe nutzt',
  safeguard: '[Prüfen: kein Auftragsverarbeitungsvertrag der App mit Google/Apple – reicht ein Hinweis, oder bleibt die Spracheingabe bis zu einer EU-Lösung (z. B. Mistral) aus?]',
},
```

**Zusätzlich als Punkt** in „Was mit deinen Daten passiert“ und als kleiner Hinweis am Mikrofon:
> Nutzt du die Spracheingabe, wandelt dein Browser deine Sprache in Text um. In Chrome und Edge geschieht das in der Regel bei Google, in Safari bei Apple, jeweils auch in den USA. Ohne Spracheingabe gelangt davon nichts dorthin.

---

### ☐ A3 Nutzung über das eigene Konto hinaus: Supervision und Lernbasis

**Steht da** (Vereinbarung): „Ich nutze deine Inhalte ausschließlich, damit der Begleiter für dich funktioniert … Ich nutze sie nie für Werbung … `[Prüfen: Supervision und Coach-Reflexionen …]`“

**Code: es gibt zwei Wege über das eigene Konto hinaus.**

1. **Supervision (immer aktiv):**
   - Nach jedem Gespräch schreibt die KI eine Selbstreflexion: was wirksam war, was gefehlt hat, Hinweis für ähnliche Gespräche (`post-conversation` → `coach_reflections`). Sie hängt am Gespräch und wird mit dem Konto gelöscht, sonst nach 12 Monaten.
   - Für diese Reflexionen gibt der Prompt **keine** Anonymisierungsregel vor.
   - Wöchentlich fasst `supervision` die Reflexionen **aller** Nutzer und das Feedback zu allgemeinen Empfehlungen zusammen. Der Prompt verbietet dabei Einzelfälle, Zitate und Personendetails. Das Ergebnis liegt in `supervision_logs`, 24 Monate.
   - Seit 19.11.2026 stehen diese Empfehlungen im Prompt **jedes** Gesprächs (`SUPERVISION_IN_PROMPT=1`).
2. **Lernbasis (nur mit Opt-in im Profil und Schalter `RAG_LEARNING_ENABLED=1`):**
   - Aus dem Gespräch entsteht eine anonymisierte Erfahrung.
   - Eine KI prüft sie auf Namen, Orte und Krisendetails (`reviewLearningEntry`).
   - Gespeichert wird sie in `experience_patterns`. Sie hilft dem Begleiter auch in Gesprächen mit anderen Menschen.
   - Nimmt jemand die Zustimmung zurück, löscht `set_learning_opt_in` die eigenen Einträge.

**Vorschlag** (ersetzt den Punkt „Ich nutze deine Inhalte ausschließlich …“):
> Ich nutze deine Inhalte, damit der Begleiter für dich funktioniert. Dazu gehört, dass die App deine Gespräche auswertet, um dir deinen Spiegel und deine Erkenntnisse zu zeigen.
>
> Damit der Begleiter insgesamt besser wird, hält die KI nach jedem Gespräch kurz fest, was im Gespräch geholfen hat und was gefehlt hat. Einmal pro Woche fasst sie diese Notizen aus allen Gesprächen zu allgemeinen Empfehlungen für den Begleiter zusammen. Diese Empfehlungen enthalten keine Zitate und keine Angaben zu einzelnen Menschen. Sie fließen in die Antworten des Begleiters für alle ein. Die Notizen werden nach 12 Monaten gelöscht, die Zusammenfassungen nach 24 Monaten.
>
> Nur wenn du im Profil zustimmst: Aus deinen Gesprächen entstehen anonymisierte Erfahrungen, die dem Begleiter auch in Gesprächen mit anderen Menschen helfen. Bevor eine Erfahrung gespeichert wird, prüft die KI, dass sie keine Namen, Orte oder Details zu einer Krise enthält. Nimmst du die Zustimmung zurück, werden deine Erfahrungen gelöscht.
>
> Ich nutze deine Inhalte nicht für Werbung und verkaufe sie nicht.

**Offene Punkte:**
- `[Prüfen: Ist die Supervision über alle Nutzer von der Einwilligung (Art. 9) gedeckt oder braucht sie eine eigene Grundlage? Gegebenenfalls in CONSENT_ART9_CHECKBOX aufnehmen: „… und damit der Begleiter aus allen Gesprächen lernt, was hilft“.]`
- Sprachprinzip: Im Entwurf steht „nie für Werbung“. „nie“ als Absolutum steht auf der Liste. Der Vorschlag nutzt „nicht“.

---

### ☐ A4 OpenAI: was dorthin geht und wozu

**Steht da:**
- Vereinbarung: „Die erste Nachricht eines Gesprächs geht zusätzlich an OpenAI (USA), damit die App ähnliche frühere Gespräche wiederfindet.“
- `DATA_RECIPIENTS` OpenAI: „Vektorberechnung, um ähnliche frühere Gespräche wiederzufinden“ · „Erste Nachricht eines Gesprächs“

**Code:**
- Die erste Nutzer-Nachricht (bis 2.000 Zeichen) geht an OpenAI (`text-embedding-3-small`, `_shared/rag.ts`). Das ist richtig.
- Gesucht werden aber **nicht die eigenen früheren Gespräche**. Gesucht wird in der **Lernbasis**: anonymisierte, geprüfte Erfahrungen (`match_experiences`, nur `approved`). Die eigenen früheren Gespräche kennt der Begleiter über Briefing und Akte, ohne OpenAI.
- Die Nachricht geht auch dann an OpenAI, wenn die Lernbasis leer oder ausgeschaltet ist.
- Mit Lernbasis (Opt-in und Schalter) gehen zusätzlich die **anonymisierten Erfahrungen** an OpenAI (`post-conversation`, ebenso `backfill-embeddings`).

**Vorschlag** (Vereinbarung):
> Die erste Nachricht eines Gesprächs geht zusätzlich an OpenAI (USA). Daraus wird ein Zahlenwert berechnet, mit dem die App passende anonymisierte Erfahrungen findet, die dem Begleiter helfen. Hast du der Lernbasis zugestimmt, gehen auch die anonymisierten Erfahrungen aus deinen Gesprächen an OpenAI.

**Vorschlag** (`DATA_RECIPIENTS`):
```js
purpose: 'Berechnung von Zahlenwerten (Vektoren), um passende anonymisierte Erfahrungen zu finden',
data: 'Erste Nachricht eines Gesprächs; mit Zustimmung zur Lernbasis zusätzlich anonymisierte Erfahrungen',
```

`[Prüfen: Lohnt sich der Aufruf, solange die Lernbasis leer bzw. aus ist? Ohne ihn ginge gar nichts an OpenAI – das wäre eine technische Entscheidung, keine Textfrage.]`

---

### ☐ A5 Krise: Ausschnitt und Eintrag

**Steht da:** „… speichert einen kurzen Ausschnitt. Diesen sehe ich mir später an … Der Ausschnitt wird nach meiner Sichtung gelöscht, spätestens nach 90 Tagen.“

**Code:**
- `chat` speichert bei einem Hinweis die ersten **300 Zeichen der Nachricht** in `crisis_events`, dazu Zeitpunkt, Einstufung (niedrig/mittel/hoch) und Gesprächs-ID.
- `apply_retention` (täglich) leert den Ausschnitt, sobald `reviewed_by_jerome = true` gesetzt ist, sonst nach 90 Tagen. Das stimmt mit dem Text überein.
- **Der Eintrag selbst** bleibt bis zum Ende des dritten Kalenderjahres nach dem Ereignis. Das steht nirgends.
- Mit dem Konto wird alles gelöscht (CASCADE).
- Ein Werkzeug zum Sichten gibt es nicht, nur den direkten Zugriff im Supabase-SQL-Editor (siehe A6).

**Vorschlag:**
> Erkennt die App in einem Gespräch Hinweise auf eine akute Krise, zeigt sie dir Hilfsangebote und speichert einen kurzen Ausschnitt deiner Nachricht (höchstens 300 Zeichen). Diesen sehe ich mir später an, um [Prüfen: Zweck der Sichtung benennen, z. B. die Krisenerkennung zu verbessern]. Ich kann dabei nicht in Echtzeit reagieren. Der Ausschnitt wird nach meiner Sichtung gelöscht, spätestens nach 90 Tagen. Dass es einen solchen Hinweis gab (Zeitpunkt und Einstufung, ohne deinen Text), bleibt bis zum Ende des dritten Jahres danach gespeichert, damit ich nachweisen kann, dass die App Hilfsangebote gezeigt hat. Löschst du dein Konto, wird auch das sofort gelöscht.

`[Prüfen: Zweck und Dauer der Aufbewahrung des Eintrags (drei Jahre = Verjährungsfrist) mit dem Anwalt bestätigen.]`

---

### ☐ A6 Betreiberzugang: nicht protokolliert

**Steht da:** „Ich lese deine Gespräche nicht. Ausnahmen: … `[Prüfen: Wird jeder Betreiberzugriff protokolliert? …]`“

**Code:**
- **Nein.** Der Admin-Bereich der App (`admin-users`, `admin-feedback`, `admin-security`) zeigt keine Gesprächsinhalte.
- Über das Supabase-Dashboard (Tabellen, SQL-Editor) hast du aber vollen Lesezugriff auf alle Daten. Die App protokolliert diese Zugriffe nicht.
- Eine protokollierte Coach-Einsicht ist als S-20 geplant und nicht gebaut.

**Vorschlag:** Den Satz „Jeder Zugriff wird protokolliert“ **nicht** aufnehmen. Ehrliche Ergänzung:
> Ich lese deine Gespräche nicht. Ausnahmen: Du bittest mich darum, ein technischer Fehler erfordert meinen Eingriff, oder ich bin gesetzlich dazu verpflichtet. Technisch habe ich über die Verwaltung der Datenbank Zugriff auf alle gespeicherten Daten. Diese Zugriffe werden derzeit nicht gesondert protokolliert.

`[Prüfen: Bietet der Supabase-Plan ein Audit-Log für Dashboard-Zugriffe? Dann ließe sich „Zugriffe auf die Datenbank werden protokolliert“ schreiben. Sonst S-20 vorziehen.]`

---

### ☐ A7 Konto löschen: zwei Ausnahmen

**Steht da** (Deine Rechte, `closing`): „Löschst du dein Konto, werden deine Daten sofort aus der App entfernt und {BACKUP_DELETION} auch aus den Sicherungskopien gelöscht.“

**Code:**
- `delete-account` löscht Gespräche, Nachrichten und Profil, danach das Auth-Konto. Alles Weitere fällt per CASCADE weg, auch Lernbasis-Einträge (`source_user_id`), Reflexionen und Krisen-Einträge. Der Löschtest zeigt überall 0.
- **Ausnahme 1:** Technische Protokolle (`app_logs`) bleiben bis zu 30 Tage stehen. Die Nutzer-ID wird geleert (SET NULL). Sie enthalten nur IDs, Zähler und Fehlercodes.
- **Ausnahme 2:** Wöchentliche Supervisions-Zusammenfassungen (`supervision_logs`, siehe A3), in die Reflexionen eingeflossen sind, bleiben bis zu 24 Monate. Sie lassen sich niemandem zuordnen.
- Die Sicherungskopien laufen nach dem Rhythmus von Supabase ab (Frist im Dashboard unter Database → Backups ablesen).

**Vorschlag:**
> Löschst du dein Konto, werden deine Daten sofort aus der App entfernt und {BACKUP_DELETION} auch aus den Sicherungskopien gelöscht. Technische Protokolle ohne Inhalte bleiben noch bis zu 30 Tage, dann ohne Verbindung zu deinem Konto. Allgemeine Empfehlungen für den Begleiter, in die Notizen aus deinen Gesprächen eingeflossen sind (siehe oben), bleiben bis zu 24 Monate. Sie lassen sich dir nicht zuordnen.

---

### ☐ A8 Erneute Zustimmung: was in der Zwischenzeit gilt

**Steht da** (`RECONSENT.pendingText`): „Bis du dich entschieden hast, kannst du keine neuen Gespräche führen. Deine bisherigen Daten bleiben so lange gespeichert. Entscheidest du dich innerhalb von [Frist] nicht, erinnere ich dich per E-Mail. Kommt danach … keine Antwort, lösche ich dein Konto …“

**Code:**
- Die Sperre aus W3 (`ConsentGateScreen`) sperrt die **ganze App**: Heute, Gespräch, Spiegel, Verlauf.
- Erreichbar bleiben Profil, Datenexport, Konto löschen, Abmelden und die Rechtstexte.
- Erinnerungsmail und Löschung nach Frist gibt es **nicht**. Es gibt nur den Bericht über inaktive Konten (`inactive_accounts_report`, Migration 033) ohne Mailversand.
- Der Text wird bisher nirgends angezeigt.

**Variante 1: Text an den Code anpassen** (keine Änderung am Code außer der Anzeige):
> Bis du dich entschieden hast, ist die App für dich pausiert. Erreichbar bleiben dein Profil, der Download deiner Daten und das Löschen deines Kontos. Deine bisherigen Daten bleiben so lange gespeichert. Entscheidest du dich nicht, schreibe ich dir nach [Offen: Frist] eine E-Mail. Kommt danach innerhalb von [Offen: weitere Frist] keine Antwort, lösche ich dein Konto mit allen Daten.

Die Erinnerung und die Löschung wären dann ein **Ablauf bei dir**: Bericht über inaktive bzw. nicht zustimmende Konten, Mail von Hand, Löschung über den Admin-Bereich. Das gehört in einen schriftlichen Ablauf wie den Notfallplan. Ohne diesen Ablauf den letzten Satz streichen.

**Variante 2: Code an den Text anpassen** (eigene Arbeit, nicht im Handoff):
- Die Sperre greift nur noch für neue Gespräche. Spiegel, Heute und Verlauf bleiben lesbar.
- Rechtlich zu klären: Ist das Lesen alter, ausgewerteter Inhalte ohne gültige Einwilligung zulässig? `[Prüfen]`

**Empfehlung:** Variante 1, sie ist einfacher und datenschutzrechtlich vorsichtiger.

---

## B. Zugesagt, aber nicht gebaut

### Kleine Code-Lücken (Claude Code, auf `konto/paket-k-w3`)
- ☐ **B1 KI-Hinweis im Chat:** `CHAT_AI_NOTICE` dauerhaft klein im CoachScreen anzeigen (unter dem Eingabefeld).
- ☐ **B2 „Deine Rechte“ vollständig anzeigen:** `CoachingAgreementContent` rendert `closing` noch nicht. Die Sätze „Schreib mir dafür …“ und der Satz zur Löschung sind unsichtbar.
- ☐ **B3 Impressum-Link auf Screen 3:** `LEGAL_LINKS` nutzen. Als Ziel bieten sich die App-Routen `/datenschutz` und `/impressum` an, statt `[Offen: URL]`.
- ☐ **B4 Notfall-Hinweis im Profil:** `NOT_EMERGENCY.short` anzeigen. Die Krisenantwort im Chat nennt 0800 111 0 111, 0800 111 0 222, 116 123, 112 und 110. Die 116 117 aus `NOT_EMERGENCY.contacts` fehlt dort (Prompt in `chat/index.ts`, Erkennung in `CrisisResponseCard`).
- ☐ **B5 Hinweis bei der erneuten Zustimmung:** `RECONSENT.pendingText` im `ConsentGateScreen` anzeigen, nach der Entscheidung zu A8.
- ☐ **B6 Hinweis an der Spracheingabe** (A2), sobald der Text steht.

### Größere Lücken (eigene Tranchen oder Abläufe)
- ☐ **B7 Abo komplett:**
  - fehlt: Zahlung, Bestellübersicht mit „Zahlungspflichtig bestellen“ (§ 312j), Häkchen „sofort beginnen“, Bestätigungsmail mit Vereinbarung und Widerrufsbelehrung
  - fehlt: Button „Verträge hier kündigen“ im Profil (§ 312k) mit Bestätigungsseite und Mail
  - fehlt: Seiten für Widerrufsbelehrung und Muster-Formular
  - Die Vereinbarung verweist schon auf „Verträge hier kündigen in deinem Profil“.
  - **Vorschlag:** Die Abschnitte „Kosten, Laufzeit und Kündigung“ sowie den Abo-Teil von „Wann die Vereinbarung endet“ erst mit dem Start der Zahlung zeigen.
- ☐ **B8 Kennenlernen vollständig beschreiben:**
  - 3 kostenlose Starts: stimmt (`session_limit` Default 3).
  - Spiegel und Erkenntnisse bleiben im Ruhemodus sichtbar: stimmt.
  - **Fehlt im Text:** Ein Gespräch im Kennenlernen umfasst höchstens 100 Nachrichten (`conversation_cap`).
- ☐ **B9 Abläufe ohne App-Funktion** (schriftlich festhalten, wie den Notfallplan):
  - Widerruf der Einwilligung per Mail → Konto löschen
  - Berichtigung, Einschränkung, Widerspruch (Art. 16, 18, 21) per Mail
  - Kündigung kostenloser Konten mit Mail-Vorlauf
  - Ankündigung nachteiliger Änderungen
  - Sperre bei Missbrauch (Supabase: Nutzer sperren)
- ☐ **B10 Frist für die Sicherungskopien:** im Supabase-Dashboard (Database → Backups) ablesen und als `BACKUP_DELETION` eintragen.
- ☐ **B11 Zustimmung nur im Frontend:** `chat` prüft die Zustimmung nicht (Beobachtung aus W3).

## C. Schon umgesetzt (stimmt mit dem Code überein)

- **Gespräche und Datenweg:**
  - Gespräche werden gespeichert.
  - Sie gehen verschlüsselt (TLS) an Anthropic, für Antworten, Auswertung und Krisenerkennung.
- **Notfall:**
  - Kein Notfalldienst, niemand liest live mit. Die stündliche Überwachung zählt nur Ereignisse, ohne Inhalte.
  - Krisenerkennung mit Hilfsangeboten und anklickbaren Nummern.
- **Rechte in der App:**
  - Auskunft und Datenübertragbarkeit über „Daten herunterladen“ (`export-my-data`).
  - Löschung über „Konto löschen“ (Löschtest überall 0).
  - Eine neue Fassung gilt erst nach Zustimmung (W3, `accept_consent_v2`, Sperre vor der App).
- **Zustimmung beim Einstieg:**
  - 18+ wird bei der Registrierung bestätigt (`age_confirmed_at`), Bestandsnutzer bestätigen einmalig.
  - Zwei getrennte, nicht vorausgewählte Häkchen. Der Server setzt die Felder nur für Version 2.0.
- **Sonst:**
  - Keine Werbung, kein Tracking, keine Drittanbieter im Frontend (CSP, Schriften lokal).
  - Sicherheitsprotokolle aus berechtigtem Interesse: `app_logs` 30 Tage, `security_alerts`.

## D. Andere App-Texte, die der neuen Fassung widersprechen

- ☐ **D1 `DatenschutzScreen.jsx`:**
  - „Zero Data Retention Policy von Anthropic“ (Z. 107); die neue Fassung sagt „höchstens befristet“.
  - „Frankfurt/Ireland“ (Z. 92).
  - OpenAI fehlt, Google/Apple für die Spracheingabe fehlen.
  - „innerhalb von 30 Tagen endgültig gelöscht“ (Z. 126) statt der Backup-Frist.
  - „Logs bis zu 90 Tage“; tatsächlich sind es 30 Tage.
- ☐ **D2 Löschfenster in `ProfileScreen.jsx`:** „Deine Daten bei Anthropic (API-Logs) werden nach 30 Tagen automatisch gelöscht“ (Z. 313).
- ☐ **D3 `LandingScreen` und `AuthScreen`:** „Keine Weitergabe an Dritte — niemals“.
- ☐ **D4 „Lieber nicht“:** Der Link zeigt auf `https://www.friedensstifter.coach/contact/`. Bitte prüfen, ob es die Seite gibt.
- ☐ **D5 Sicherheitsseite (`securityMeasures.js`):** Die Einträge R-3 Anthropic und R-3 OpenAI stehen auf `text_offen`. Nach A3/A4 gegebenenfalls freischalten.

## Reihenfolge

1. **Jerome:** A1–A8 im Text entscheiden bzw. übernehmen (Grundlage für den Anwalt), B10 ablesen.
2. **Claude Code:** B1–B6 auf `konto/paket-k-w3`. Bei A8 erst nach Jeromes Entscheidung.
3. Danach D1–D5, dann das Abo (B7) als eigene Tranche.

---

# Entwurf v3 (20.11.2026): Bewertung und Umsetzungsplan

v3 übernimmt A1–A8 und B8. **Inhaltlich passt v3 zum Code, sobald CODE-1 bis CODE-5 umgesetzt sind.** Beim Gegenprüfen sind noch einige Punkte aufgefallen.

## Neue Befunde

- ☐ **N1 Produktion bleibt dauerhaft gesperrt:** `allLegalStrings()` sammelt auch Abo, Bestellung, Kündigung, Widerruf, Zahlungsdienstleister und Mistral ein. Diese enthalten `[Offen: …]`, bis die Zahlung bzw. Mistral gebaut sind. Mit `LEGAL_TEXTS_APPROVED = true` scheitert der Build deshalb, auch wenn alle Texte für den Start fertig sind. → **CODE-6**
- ☐ **N2 Spracheingabe:** Die Sicherheitsseite zeigt live „Spracheingabe über die Spracherkennung deines Browsers … Google (Chrome) oder Apple (Safari)“ (`securityMeasures.js`, `S-11 Spracheingabe`). Dazu gibt es einen Hinweis beim ersten Tippen aufs Mikrofon (`ChatInput`). Mit CODE-1 (Spracheingabe aus) wird dieser Eintrag falsch. → Teil von CODE-1
- ☐ **N3 Reflexionen:** Der Text verspricht „ohne Namen, Zitate und andere Angaben, die dich erkennbar machen“. Ein Prompt allein sichert das nicht zu. Außerdem gilt CODE-3 nur für neue Notizen, die bisherigen `coach_reflections` sind ohne diese Regel entstanden. → CODE-3 mit Prüfschritt, **Entscheidung E1**
- ☐ **N4 Supervision liest auch Feedback-Texte:** `supervision` wertet neben den Reflexionen auch `user_feedback.content` aus (nur `consent_given = true`). Die Vereinbarung nennt nur die Notizen. `[Prüfen: Deckt der Einwilligungstext im Feedback-Formular diese Nutzung? Sonst in der Vereinbarung ergänzen.]`
- ☐ **N5 Lernbasis-Zustimmung:**
  - Der neue Text (`LEARNING_OPT_IN`) ist eine ausdrückliche Art.-9-Einwilligung inkl. OpenAI.
  - Bestehende Zustimmungen wurden mit dem alten Text (`LEARNING_CONSENT_VERSION`, Paket B) gegeben.
  - → **CODE-7**, **Entscheidung E2**
- ☐ **N6 Krisen-Ausschnitt:** „nach meiner Sichtung gelöscht“ greift nur, wenn `reviewed_by_jerome = true` gesetzt wird. Dafür gibt es heute nur den SQL-Editor. → Ablauf mit SQL-Vorlage (CODE-9)
- ☐ **N7 Wartezeit bis zur Zustimmung** (`RECONSENT.pendingText`): Die Sätze zu E-Mail und Löschung setzen einen Ablauf voraus. Dafür brauchst du eine Liste der Konten ohne Zustimmung 2.0. → CODE-9, **Entscheidung E4**
- ☐ **N8 Kopplungsverbot:** Prüft der Anwalt, dass die Supervision nicht in die Pflicht-Einwilligung darf (`[Prüfen]` in `CONSENT_ART9_CHECKBOX`), braucht die Supervision eine eigene Grundlage. Für den Code hieße das: nur Reflexionen von Nutzern mit Zustimmung. Erst nach dem Anwaltstermin bauen.
- ☐ **N9 Sprachprinzip:** In der Widerrufsbelehrung steht „müssen Sie“. Das ist der gesetzliche Mustertext. Vorschlag: wie bei Buchzitaten als Ausnahme festhalten (Gesetzlichkeitsfiktion).

## Code-Aufgaben (Claude Code)

| # | Aufgabe | Dateien | Deploy |
|---|---|---|---|
| ☐ CODE-1 | Spracheingabe aus: Mikrofon in `ChatInput` hinter einem Schalter `VOICE_INPUT_ENABLED = false`, Hook bleibt für Mistral. Sicherheitsseite: Eintrag `S-11 Spracheingabe` auf `geplant` (Text „Spracheingabe folgt, Verarbeitung in der EU“). | `ChatInput.jsx`, `securityMeasures.js` | Frontend |
| ☐ CODE-2 | OpenAI nur, wenn `RAG_LEARNING_ENABLED=1` **und** es mindestens einen freigegebenen Eintrag gibt (`experience_patterns`, `review_status = 'approved'`, Zählabfrage ohne Inhalt). Sonst RAG überspringen, Log `rag_skipped` mit Grund. | `chat/index.ts`, `_shared/rag.ts` | Function `chat` |
| ☐ CODE-3 | Reflexions-Prompt: keine Namen, Orte, Zitate, erkennbaren Details. Danach Prüfschritt wie bei der Lernbasis (`reviewLearningEntry`, Codes `identifier`/`crisis`). Abgelehnt → Textfelder nicht speichern, Log `reflection_rejected`. Bestand nach E1. | `post-conversation/index.ts`, ggf. Migration 041 | Function + Migration |
| ☐ CODE-4 | `chat` prüft die Zustimmung (`consent_version` und `coaching_agreement_version` = `'2.0'`) → sonst `403 { error: 'consent_required' }`. Das Frontend zeigt dann die Sperre. Angriffstest K8, Regel `infoOnly` in `monitorRules.ts`. Ausnahme Krisenantwort: `[Prüfen]`, Vorschlag: auch ohne Zustimmung ausgeben. | `chat/index.ts`, `monitorRules.ts`, `attack-test.mjs` | Function, **nach** Migration 040 |
| ☐ CODE-5 | `CoachingAgreementContent` nutzt `getAgreementSections()` und zeigt `closing` (B2). | `CoachingAgreementContent.jsx` | Frontend |
| ☐ CODE-6 | Build-Prüfung: Abo-Blöcke (`paymentOnly`, `CHECKOUT`, `CANCELLATION`, `WITHDRAWAL_*`, Zahlungsdienstleister) und Mistral-Blöcke nur prüfen, wenn der jeweilige Schalter an ist. Vorschlag: `PAYMENTS_ENABLED` und `VOICE_MISTRAL_ENABLED` in `legalTexts.js`. Angezeigt wird ohne Schalter nichts davon. Der Mistral-Satz in der Vereinbarung und der Mistral-Empfänger bekommen dafür eine Kennzeichnung (z. B. `requires: 'mistral'`). | `check-content.mjs`, `legalTexts.js` (nur Schalter und Kennzeichnung, keine Texte) | Frontend |
| ☐ CODE-7 | Profil: `LearningConsentCard` mit `LEARNING_OPT_IN`, Häkchen statt Schalter, Version `'2.0'`. Bestand nach E2. | `LearningConsentCard.jsx`, `src/lib/consent.js`, ggf. Migration | Frontend (+ Migration) |
| ☐ CODE-8 | Restliche Anzeige: KI-Hinweis unter dem Eingabefeld (B1) · `LEGAL_LINKS` auf Screen 3 (B3) · `NOT_EMERGENCY.short` im Profil (B4) · `RECONSENT.pendingText` in der Sperre (B5). | `ChatInput`/`CoachScreen`, `ConsentStep`, `ProfileScreen`, `ConsentGateScreen` | Frontend |
| ☐ CODE-9 | SQL-Vorlagen für deine Abläufe (nur Zähler bzw. IDs): Konten ohne Zustimmung 2.0 mit Datum der letzten Anmeldung · ungesichtete Krisen-Ereignisse · „als gesichtet markieren“ per ID. | `supabase/diagnostics/k-legal-ablaeufe.sql` | – |

**Reihenfolge beim Deploy:**
1. Frontend
2. Migration 040 (+041)
3. Functions (`chat` mit CODE-2/CODE-4, `post-conversation` mit CODE-3)

Damit ist die App bei CODE-4 schon auf v2.0, und niemand wird ausgesperrt, der noch zustimmen kann.

## Entscheidungen (Jerome)

- ☐ **E1 Bisherige Reflexionen:**
  - (a) Alle bestehenden `coach_reflections` löschen. Die Supervision fängt mit neuen, geprüften Notizen an. **Empfehlung.**
  - (b) Behalten, sie laufen spätestens nach 12 Monaten aus. Bis dahin stimmt der Text nicht für alte Notizen.
- ☐ **E2 Bisherige Lernbasis-Zustimmungen:**
  - (a) Auf „aus“ setzen und die Einträge löschen. Wer mag, stimmt mit dem neuen Text neu zu. **Empfehlung.**
  - (b) Beim nächsten Öffnen des Profils neu fragen, bis dahin keine neuen Einträge.
  - Vorher per SQL zählen, ob es überhaupt Zustimmungen gibt.
- ☐ **E3 Spracheingabe jetzt ausschalten:** Bestätigen, dass das Mikrofon bis Mistral verschwindet (CODE-1).
- ☐ **E4 Wartezeit bis zur Zustimmung:**
  - (a) Ablauf schriftlich festlegen (Fristen, Mail von Hand, Löschung über den Admin-Bereich) und die Sätze behalten.
  - (b) Die letzten zwei Sätze streichen.

## Angaben und Prüfungen (Jerome bzw. Anwalt)

- **Stammdaten:** Anschrift, E-Mail, Telefon (`OPERATOR`).
- **Fristen:**
  - Löschfrist der Sicherungskopien (Supabase → Database → Backups).
  - Fristen in `RECONSENT.pendingText` und für die Kündigung kostenloser Konten.
- **Zweck der Krisen-Sichtung** bestätigen (`[Offen: Zweck bestätigen]`).
- **E-Mail-Versand:** Supabase → Authentication → SMTP Settings. Steht dort nichts, versendet Supabase selbst. Das gehört in `DATA_RECIPIENTS`. Die Alarm-Mails über One.com gehen nur an dich und enthalten keine Nutzerdaten.
- **„Lieber nicht“:** Gibt es die Kontaktseite `…/contact/`? (D4)
- **Für den Anwalt:**
  - Kopplungsverbot Supervision (N8)
  - Krisen-Eintrag 3 Jahre (Art. 9 Abs. 2 lit. f)
  - DPF/SCC je Anbieter, Fristen laut DPA
  - Haftung beim kostenlosen Kennenlernen
  - Widerrufsbelehrung mit „ich“
- **Datenschutzerklärung (D1)** an `DATA_RECIPIENTS` und die Fristen angleichen, dazu die alten Sätze D2/D3.
