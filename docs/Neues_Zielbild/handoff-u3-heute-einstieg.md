# Handoff U3 – Heute & Gesprächseinstieg (v1.0, freigegeben)

**Für:** Claude Code · **Stand:** 19.11.2026 · **Basis:** `main` nach U2 (`eb0556bf` + Doku `u2/doku`)
**Konzept:** UX „Kreislauf“ v1.2, Abschnitte 4.1, 4.2a–c, 8.1 (nur `surfaced_at`/`confirmed_at`/`dismissed_at`), 8.2 · Umsetzungsplan v1.0, Tranche U3
**Branch:** `u3/heute-einstieg` · ein Deploy: **Migration 035** + Edge Functions `chat`, `pre-session-briefing`, `post-conversation` + Frontend

> Aus der Code-Inventur. Punkte mit **[E-U3-x]** weichen vom Konzept ab oder füllen eine Lücke. **Alle am 19.11.2026 von Jerome freigegeben.**

---

## 1. Inventur (Ist-Stand)

| Stelle | Ist | Folge für U3 |
|---|---|---|
| `CoachScreen` Mount | Ohne Navigation-State startet **jeder Besuch des Tabs ein neues Gespräch** (Pool-Text, neue `conversations`-Zeile). Varianten: 0 Resume (`resumeConversationId`), 3 Wellness, 4 Entry-Kontext, 1 Wiederkehr-Begrüßung (`start: 'briefing'`, Regel „≥ 2 Tage, ≥ 5 Tage seit letzter Begrüßung“, schreibt `profiles.last_return_greeting_at` vom Client), 2 Standard | Einstieg ersetzt Variante 1 und den automatischen Neustart |
| `useChat.loadConversation` | lädt nur die Nachrichten, **legt keinen neuen Eintrag an**; Senden zählt nicht neu (`consume_session` idempotent über `session_counted_at`) | „Fortsetzen ohne neuen Start“ ist bereits gegeben. Neu ist nur, dass der Coach beim Weitermachen zuerst spricht |
| `useChat.startStreamedOpening` | legt **immer** eine neue Konversation an (`wellness`/`briefing`/`entry`) | Coach-spricht-zuerst auf einem **bestehenden** Gespräch braucht einen neuen Weg |
| `chat` Briefing (`loadCoachContext`) | BLOCK 1 nutzt das **letzte abgeschlossene andere** Gespräch (`neq('id', convId)`), `title` als „Themenfeld“ | Beim Weitermachen geht es um **dieses** Gespräch → eigener Block |
| `conversations.title` | vom Client gesetzt, immer ein Platzhalter („Neues Gespräch“, „Gespräch“, „Wellness-Check“), nicht wie im Konzept 8.2 angenommen aus dem ersten Nutzer-Input | O-1 (siehe E-U3-3) |
| `post-conversation` `SESSION_NOTES_PROMPT` | liefert `main_topic`, `where_we_left_off` …; schreibt `summary`, `open_thread`, `open_thread_intensity` | um `display_title` ergänzen |
| `pre-session-briefing` | nur `daysSince`, `conversationCount`, `openThread.intensity` (Angriffstest #9 verbietet `summary`, `text`, `topicHint` u. a.) | um die letzten 3 Gespräche **ohne Inhalte** ergänzen |
| `HomeScreen` | Begrüßung, „Neu hier?“-Karte, Tagesimpuls, Werkzeugkasten-Grid, „Wie funktioniert die App?“ | wird zu Heute A–D/C2 |
| `insights` | `source` `auto`/`user`, kein Feld für „angezeigt/bestätigt/weggeschoben“ | Migration 035 |
| `ConversationEndModal` + `CoachScreen.handleInsightConfirm` | bestätigte Erkenntnis wird mit `source: 'auto'` und **ohne Fehlerprüfung** gespeichert | Abschluss-Schritt „Magst du etwas ausprobieren?“, `source: 'user'` |
| `chat` `HOWTO_SYSTEM_PROMPT` (Z. 427–429) | beschreibt noch „Mein Spiegel (Erkenntnisse + Akte)“, „Verstehen“, „Innere Stimmen (Premium)“, „Reflexionssträhne … in Folge“, „bis zu 10 Erkenntnisse“ | seit U1/U2 falsch → E-U3-8 |
| Migrationsnummern | zuletzt 034; Paket C hatte 035 (C-3) und 036 (C-5) **vorgemerkt** | E-U3-9 |

## 2. Abweichungen und Entscheidungen (Freigabe durch Jerome)

**[E-U3-1] Weitermachen mit „Coach spricht zuerst“: neue Start-Variante `resume` in `chat`.** Body `{ conversationId, start: 'resume' }` auf einem **bestehenden, eigenen** Gespräch mit mindestens einer Nutzer-Nachricht (sonst `400 invalid_start`). Der Server lädt den Verlauf wie gewohnt und setzt statt BLOCK 1 einen Block **„FORTSETZUNG“** mit Datum der letzten Nachricht (relativ), `summary` und `open_thread`/`open_thread_intensity` **dieses** Gesprächs. Anweisung: kurz anknüpfen (ein Halbsatz Zeitbezug), höchstens eine Frage, **Ausweg** („Oder bringst du heute etwas anderes mit?“), bei `high` das Thema nicht nennen, keine Bewertung. `ensureEndsWithUser` (T0) greift, weil der Verlauf auf `assistant` enden kann. Zählung: `consume_session` wie bei jeder Eröffnung (idempotent – ein schon gezähltes Gespräch wird nicht neu gezählt). Keine neue Konversation.

**[E-U3-2] Einstieg als Zustand im `CoachScreen`, nicht als eigene Route.** `/coach` zeigt den Einstieg, wenn keine Ausnahme greift (Tabelle 4.2a):

| Situation | Verhalten |
|---|---|
| noch kein Gespräch mit eigener Nachricht | kein Einstieg, Start mit `FIRST_OPENING_MESSAGE` |
| `resumeConversationId` (Verlauf) | kein Einstieg, Gespräch öffnet sich ohne Coach-Nachricht (wie bisher) |
| Entry-Kontext (Tagesimpuls, Muster) | kein Einstieg, Start mit Kontext |
| Wellness-Check | kein Einstieg (hat Vorrang) |
| letzte Nachricht im jüngsten Gespräch < 2 h | kein Einstieg, dieses Gespräch öffnet sich (wie Verlauf) |
| sonst | **Einstieg**: Weitermachen (bis zu 3 Gespräche) · „Alle Gespräche →“ `/coach/verlauf` · **[Etwas Neues mitbringen]** (Pool, Variante 2) · „Erst mal ankommen → Wie geht's dir?“ |

Die Wiederkehr-Begrüßung (Variante 1) und das Schreiben von `last_return_greeting_at` entfallen (Konzept 4.2a). Die Spalte bleibt; der Server-Startweg `briefing` bleibt technisch erhalten, wird aber vom Frontend nicht mehr aufgerufen. Kopfzeile im Chat (4.2b): „←“ zurück zum Einstieg (stößt wie bisher `post-conversation` an) statt des Verlauf-Knopfs; „Neues Gespräch“ mit Abschluss-Modal bleibt.

**[E-U3-3] O-1: `display_title` überschreibt `conversations.title` – keine neue Spalte.** `title` trägt heute nur Platzhalter, es geht also nichts verloren. `SESSION_NOTES_PROMPT` bekommt `"display_title": "3–5 Wörter, neutral, ohne Namen, ohne Diagnose"`; `post-conversation` übernimmt ihn nur, wenn er ein String ≤ 60 Zeichen ist (Anführungszeichen/Zeilenumbrüche entfernt), sonst bleibt `title` unverändert (Log `display_title_invalid`, nur Länge). Bestandsgespräche behalten den Platzhalter; der Einstieg zeigt dann „Gespräch vom <Datum>“ statt Platzhalter. Nebeneffekt: BLOCK 1 („Themenfeld“) bekommt endlich einen sinnvollen Wert.

**[E-U3-4] Einstiegsdaten über `pre-session-briefing`, ohne Inhalte.** Neues Feld `recent: [{ id, title, lastActivityAt, hasOpenThread, moving }]` – die 3 jüngsten eigenen Gespräche mit mindestens einer Nutzer-Nachricht und `summary`. `moving = open_thread_intensity === 'high'`; dann ist `title = null` (Anzeige „Ein Gespräch, das dich bewegt hat“). Platzhalter-Titel werden als `null` geliefert. Weiter verboten: `summary`, `open_thread`-Text, `topicHint`, Akte. Dazu `latestActiveConversation: { id, lastMessageAt } | null` für die 2-Stunden-Regel. Angriffstest #9 bleibt gültig (prüft die verbotenen Felder).

**[E-U3-5] Heute A–D + C2, Auswahl im Frontend aus vorhandenen Daten.**
- **A – Neu:** kein Gespräch mit ≥ 3 Nachrichten (`get_conversation_history`). „So funktioniert's“-Karte (Text aus 4.1) · [Erstes Gespräch beginnen] · „Erst mal ankommen → Wie geht's dir?“.
- **D – Heute schon gesprochen:** ein Gespräch mit ≥ 3 Nachrichten, dessen letzte Aktivität heute (lokal) war. Ruhige Karte „Du warst heute schon im Gespräch. Lass es ruhig nachwirken.“ · „Was du erkannt hast → Spiegel“.
- **B – Nachklang:** neueste Erkenntnis der letzten 7 Tage mit `dismissed_at IS NULL` und `confirmed_at IS NULL`, Kategorie `ziel` zuerst. Karte **verdeckt** („Aus deinem letzten Gespräch · Antippen zum Anzeigen“), Erklärzeile dauerhaft sichtbar („Verdeckt, damit niemand mitliest, der gerade auf dein Handy schaut.“). Nach Antippen: Text; bei `source='auto'` „Stimmt das so?“ mit **Ja** (→ `source='user'`, `confirmed_at`) · **Anpassen** (eigener Wortlaut, `source='user'`, `confirmed_at`) · **Entfernen** (löschen). Bei `source='user'` nur der Text. „Heute nicht“ → `dismissed_at`, ohne Rückfrage. Darunter Nebenkarte Tagesimpuls.
- **C – Ruhe:** Tagesimpuls als Hauptkarte · „Erst mal ankommen → Wie geht's dir?“ · „Ins Gespräch →“.
- **C2 – Wiederentdecken** (statt Tagesimpuls): Erkenntnis älter als 14 Tage, `surfaced_at IS NULL`, nicht entfernt; nur wenn in der laufenden Kalenderwoche noch keine Wiederentdeckung gezeigt wurde. Verdeckt wie B („Vor <Zeitraum> hast du etwas erkannt.“). `surfaced_at` wird gesetzt, sobald die Karte angezeigt wird; die Wochenregel erkennt eine Wiederentdeckung daran, dass `surfaced_at` mehr als 14 Tage nach `created_at` liegt (keine zusätzliche Spalte).
- Reihenfolge: A → D → B → C2 → C.
- **Nicht in U3:** „Daran weiterarbeiten →“ / „Wie war es seitdem?“ und „Deine Einschätzung“ (U5a; der Ursprungs-Einstieg 4.2d gehört dorthin), Vorrang für ✦ bei C2 und Ausschluss „Teile ich nicht“ (Spalten kommen in U5a), Buch-Status-Karte (braucht T1), Perspektiven-Spiegel.
- Das Werkzeugkasten-Grid und die „Neu hier?“-Karte entfallen. „Wie funktioniert die App?“ bleibt als dezenter Link.

**[E-U3-6] „Vorschlag – stimmt das?“ auch im Spiegel** (Ebene Erkenntnisse, aus U2 hierher verschoben): dezenter Hinweis an `source='auto'`-Karten mit Ja · Anpassen · Entfernen, dieselbe Logik wie auf Heute.

**[E-U3-7] Abschluss-Modal (4.2c).** Nach „Ja, stimmt so“/„Anpassen“ wird die Erkenntnis mit **`source: 'user'`** und `confirmed_at` gespeichert (der Nutzer hat sie bestätigt; bisher `auto`) – mit Fehlerprüfung, bei Fehler Hinweis im Modal statt stillem Weiter. Dann Schritt 2: „Liegt jetzt in deinem Spiegel. Magst du etwas ausprobieren?“ · Freitext optional · **Fertig** (speichert `category='ziel'`, `source='user'`, `confirmed_at`, falls Text) · **Überspringen**. Die Einschätzung nach einem Weiterarbeiten-Gespräch folgt in U5a. Der Text „Der Coach hat etwas für dich notiert“ wird zu „Das ist aus dem Gespräch entstanden – stimmt es so?“ (kein Coach-Wort im aktiven UI).

**[E-U3-8] Howto-Fakten aktualisieren** (`HOWTO_SYSTEM_PROMPT`, „Wie es funktioniert“): drei Bereiche Heute · Gespräch · Spiegel (Erkenntnisse · Muster · Entwicklung), Reflexionstage im Profil (gesamt, nicht in Folge), keine Grenze im Spiegel, Stimmen für alle sichtbar. Die Kostenzeile („20 Gespräche/Monat“) bleibt bis U4. Sonst zeigt „Wie es funktioniert“ Nutzern ab dem Deploy falsche Antworten.

**[E-U3-9] Migrationsnummer.** U3 nimmt **035**. Die in Paket C vorgemerkten Nummern verschieben sich (C-3 → 036, C-5 → 037). Ich trage das in `docs/security/handoff-security-paket-c.md` als Hinweis ein, ohne sonst etwas am Paket-C-Handoff zu ändern.

## 3. Umfang (AFTER)

**Migration `035_u3_insight_surfacing.sql`**
```sql
alter table public.insights
  add column if not exists surfaced_at  timestamptz,  -- auf Heute angezeigt
  add column if not exists confirmed_at timestamptz,  -- vom Nutzer bestätigt
  add column if not exists dismissed_at timestamptz;  -- „Heute nicht“
create index if not exists insights_user_created_idx on public.insights (user_id, created_at desc);
-- Rückgängig: alter table public.insights drop column surfaced_at, drop column confirmed_at, drop column dismissed_at;
--             drop index if exists public.insights_user_created_idx;
```
RLS/GRANTs unverändert (`insights` update own für `authenticated` besteht, Migration 025). Kein neuer Personenbezug außer Zeitstempeln an bestehenden Zeilen → Löschtest unverändert gültig (CASCADE über `insights`).

**Edge Functions**
- `chat`: `START_VARIANTS` + `resume` (E-U3-1), Block „FORTSETZUNG“, Howto-Fakten (E-U3-8). Neue Log-Codes: `resume_started`, `resume_rejected` (`no_user_message`) → `monitorRules.ts` als `infoOnly`.
- `pre-session-briefing`: `recent`, `latestActiveConversation` (E-U3-4).
- `post-conversation`: `display_title` → `conversations.title` (E-U3-3).

**Frontend**
- `useChat`: `resumeWithOpening(convId)` (lädt Verlauf, ruft `start: 'resume'`, streamt die Coach-Nachricht).
- `CoachScreen`: Einstieg (`src/components/coach/ConversationEntry.jsx`), Mount-Regeln (E-U3-2), Kopfzeile „←“, Abschluss mit Schritt 2.
- `ConversationEndModal`: zweiter Schritt, Fehleranzeige.
- `HomeScreen`: Zustände A–D/C2 (`src/components/today/*`), verdeckte Karte, „Stimmt das so?“, „Heute nicht“.
- `InsightsLevel`: „Vorschlag – stimmt das?“ (E-U3-6).
- Gemeinsame Logik für Bestätigen/Anpassen/Entfernen: `src/lib/insightActions.js` (Write mit `.select('id')`, Fehler sichtbar).

**Nicht in U3:** Kennenlernen/Ruhemodus/Kappung (U4), Weiterarbeiten-Einstieg 4.2d und Einschätzung (U5a), Buch-Karte (nach T1).

## 4. Vor dem Deploy (Claude Code)

- [ ] `deno check` aller geänderten Functions, `npm run build` inkl. `postbuild`
- [ ] `rg -n "last_return_greeting_at" src` → keine Treffer mehr
- [ ] `rg -n "Werkzeugkasten|TOOL_CARDS" src` → keine Treffer
- [ ] Sprachprinzip-Audit aller neuen Texte (UI, Prompt-Block FORTSETZUNG, `display_title`-Anweisung)
- [ ] Angriffstest um zwei Prüfungen erweitert: `start: 'resume'` mit fremder `conversationId` → 403; `pre-session-briefing` `recent` enthält keine verbotenen Felder und keine fremden IDs

## 5. Nach dem Deploy (Jerome, Testkonten)

Reihenfolge: **erst `main` mergen**, dann `supabase db push`, `supabase functions deploy chat pre-session-briefing post-conversation security-monitor admin-security --no-verify-jwt`, dann `notify pgrst, 'reload schema';`, dann Push (Vercel).

- [ ] **Heute A** mit frischem Testkonto; nach einem Gespräch mit ≥ 3 Nachrichten am selben Tag **D**
- [ ] **B**: am Folgetag (oder per SQL `created_at` eines Test-Insights zurücksetzen) verdeckte Karte; Antippen zeigt Text; „Stimmt das so?“ Ja/Anpassen/Entfernen; „Heute nicht“ schiebt weg und kommt nicht wieder
- [ ] **C** ohne offene Erkenntnis; **C2** mit einem über 14 Tage alten Test-Insight, danach in derselben Woche wieder C
- [ ] Auf Heute steht **kein Gesprächsthema** im Klartext
- [ ] **Einstieg**: Tab „Gespräch“ zeigt bis zu 3 Gespräche mit neutralem Titel bzw. „Ein Gespräch, das dich bewegt hat“; Weitermachen → Coach knüpft mit einer Frage + Ausweg an, **keine neue Zeile in `conversations`** (SQL-Zählung vorher/nachher); Etwas Neues → Pool-Eröffnung
- [ ] Gespräch < 2 h alt → Tab „Gespräch“ öffnet es direkt
- [ ] Abschluss: „Neues Gespräch“ → Modal → Ja → Schritt 2 → Vorhaben eintippen → Fertig → im Spiegel unter „Vorhaben“
- [ ] Nach einem neuen Gespräch: `conversations.title` ist ein neutraler Kurztitel (SQL nur Länge prüfen)
- [ ] „Wie es funktioniert“: Frage „Was ist der Spiegel?“ → Antwort nennt die drei Ebenen
- [ ] `app_logs`: `resume_started`, kein `Stream error`; `npm run security:test` alles PASS

## 6. Designdokument nach Verifikation

- ARCHITECTURE.md: HomeScreen (Zustände), CoachScreen (Einstieg, Mount-Regeln, Kopfzeile), `useChat.resumeWithOpening`, `chat` (Start `resume`, Block FORTSETZUNG, Howto-Fakten), `pre-session-briefing` (`recent`), `post-conversation` (`display_title`), `insights`-Schema, Migration 035
- CLAUDE.md: Abschnitt 3 (`insights`-Spalten), 4 (`chat`-Startvarianten, `pre-session-briefing`), 5 (CoachScreen-Eröffnungslogik, useChat), 11 (Migration 035)
- Designdokument v3.x (bei Jerome): Home/Heute, Gesprächseinstieg, Abschluss, Wiederkehr-Begrüßung entfällt

## 6a. Umsetzungsnotizen (Abweichungen beim Bauen)

- **Nachklang (B):** Ausgewählt werden noch nicht bestätigte Vorschläge (`source='auto'`, `confirmed_at IS NULL`) **und Vorhaben** (`category='ziel'`), auch wenn sie bestätigt sind. Sonst würde ein im Abschluss eingetipptes Vorhaben – das Konzept 4.2c ausdrücklich für Heute vorsieht – nie erscheinen. Beides nur in den letzten 7 Tagen und ohne „Heute nicht“.
- **`surfaced_at`:** Nachklang beim Aufdecken, Wiederentdecken beim Anzeigen (damit die Wochenregel auch ohne Antippen greift).
- **Wiederentdecken:** gewählt wird die jüngste passende Erkenntnis (älter als 14 Tage); ✦-Vorrang folgt mit U5a.
- **„Wie es funktioniert“:** Neben dem Howto-Prompt (E-U3-8) war auch die statische Liste „Dein Werkzeugkasten“ veraltet (Mein Spiegel mit Akte, Verstehen, Stimmen Premium). Ersetzt durch „So ist die App aufgebaut“ (Heute · Gespräch · Spiegel) mit einem Satz zum Kreislauf (Konzept 4.1: der Kreislauf wird dort erklärt).
- **Auswahllogik** für Heute liegt als reine Funktion in `src/lib/todayState.js` (10 Fälle lokal geprüft: A, A nur Pool, D, B, B Vorhaben vor Vorschlag, B bestätigt, B weggeschoben, C2, C2 schon diese Woche, 13 Tage alt).
- **Kurztitel nachgeschärft (nach erster Prüfung):** Ein erster Titel lautete „Authentizität statt Druck“ – eine Deutung mit Gegenüberstellung statt eines Themas. Die Anweisung verlangt jetzt Thema/Situation in Alltagssprache, verbietet Gegenüberstellungen sowie abstrakte Wert- und Fachwörter und nennt Gut-/Schlecht-Beispiele (`u3/titel-fix`).
- **Einstiegsliste (nach erster Prüfung):** `pre-session-briefing` sucht jetzt weiter (bis 20 Gespräche), bis 3 nachbearbeitete gefunden sind; vorher konnten frische, noch nicht nachbearbeitete Gespräche die Liste verkürzen. Ersatzanzeige ohne Kurztitel: heute „Gespräch um HH:MM“, sonst „Gespräch vom <Datum>“ (`u3/einstieg-fix`).
- Im Chat bleibt „Neues Gespräch“ (führt zum Abschluss-Modal); „←“ erscheint nur, wenn es einen Einstieg gibt (nicht beim Erstgespräch).

## 7. Beobachtungen (nicht Teil von U3)

- Bisher hat jeder Besuch des Gesprächs-Tabs eine leere Konversation mit Pool-Text angelegt. Mit dem Einstieg entstehen deutlich weniger leere Gespräche; die alten bleiben (sie zählen nicht, `get_conversation_history` blendet sie aus).
- `HistoryScreen` loggt bei Ladefehlern `error.message` und zeigt dann den Leerzustand – für später: Code statt Meldung, sichtbarer Fehler.
- `betaSurvey.js` kennzeichnet die Stimmen-Fragen noch als `premiumOnly`; Stimmen sind seit U2 für alle sichtbar.
