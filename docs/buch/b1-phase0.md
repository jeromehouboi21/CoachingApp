# B1 Buch-Bezüge – Phase 0 (Restfragen)

**Stand:** 21.11.2026 · Branch `feature/b1-buch-bezuege` von `main` (nach Bestandsaufnahme B1)
**Handoff:** `docs/Neues_Zielbild/handoff-b1-buch-bezuege.md` v1 · Bestandsaufnahme `docs/Neues_Zielbild/b1-bestandsaufnahme.md`
**Ergebnis kurz:** Bauen geht wie geplant. Zwei Befunde betreffen die **Taktung (E4)** und brauchen eine Entscheidung (Abschnitt 12, A4/A5). Der Rest sind kleine Anpassungen an die Projektregeln.

---

## 1. Eröffnung mit Wellness

- **Body:** `b.wellnessCheck = { score, label, emoji, context }`, geprüft in `sanitizeWellnessCheck` (`chat/index.ts:1107–1115`). Der Wert heißt **`score`** (ganze Zahl 1–10).
- **Wer legt das Gespräch an?** Der **Client**: `useChat.js:134` (`conversations.insert({ user_id, title })`, bei Wellness mit Titel „Wellness-Check“). Danach ruft er `chat` mit `start: 'wellness'` auf.
- **Folge:** `book_blocked` lässt sich nicht beim Anlegen setzen (Client-Insert, Schutz-Trigger). **Vorschlag A1:** Im Eröffnungs-Turn `start: 'wellness'` setzt `chat` per Service-Client `book_blocked = true`, wenn `score ≤ 3`. Das passiert vor jeder Nutzernachricht, wirkt also für das ganze Gespräch.

## 2. Krisenpfad

- **Erkennung:** `detectCrisis` (Haiku) Z. 1481. Der Insert in `crisis_events` geschieht schon mit `await` (Z. 1605–1616), vor dem Prompt-Bau.
- **Vorschlag A2:** `book_blocked = true` direkt neben diesem Insert, als **nicht abgewartetes** Update (Promise per `EdgeRuntime.waitUntil`, wie beim Speichern der Antwort Z. 1816). Die Krisenantwort wartet nicht darauf. Fehler werden geloggt (`book_blocked_set_failed`).

## 3. Antwortnummer

- **`assistantTurnCount`** (Z. 1469) zählt **alle** Assistant-Zeilen im geladenen Verlauf (`loadHistory`, bis 400 Zeilen, Z. 1141/1169). Gezählt wird nach dem Speichern der aktuellen Nutzernachricht.
- **Begrüßung vor der ersten Nutzernachricht:** ja. Bei `first`/`standard` speichert der Server den Pool-Text als Assistant-Nachricht (Z. 1288–1305), bei `wellness`, `entry` und `resume` erzeugt das Modell eine Eröffnung. Diese zählt mit.
- **Daraus:** `replyNo = assistantTurnCount + 1`. Beispiel Standardgespräch: Eröffnung (1) · Nutzer · Antwort 2 · Nutzer · **Antwort 3**, Verlauf dabei 4 Nachrichten. Das passt zu „ab 4 Nachrichten, vor Antwort 3“.
- **Fortsetzen:** zählt im selben Gespräch weiter. Jede Fortsetzungs-Eröffnung (`start: 'resume'`) ist eine weitere Assistant-Zeile.
- **Vorschlag A3:** Den Buch-Pfad nur in Turns mit **echter Nutzernachricht** (`newMessage`), nie in Eröffnungs-Turns (`start: …`). Dort gilt die Pflichtstruktur von FORTSETZUNG/WEITERARBEITEN bzw. der Eröffnung.

## 4. Stimmen und Mechanismus

- **`offerMechanism`** (Z. 1619–1621): `isCoaching && !resumeContext && assistantTurnCount >= 3 && assistantTurnCount % 4 === 0`. **Fest an den Turn gebunden**, also bei `assistantTurnCount` 4, 8, 12 … = **Antwort 5, 9, 13 …**
- **`introduceVoice`** (Z. 1633–1655): einmalig je Stimme. Fällig, sobald eine Kandidatin ohne `introduced_at` existiert und `assistantTurnCount >= 2`. Wird beim Senden gesetzt.
- **`namingVoice`** (Z. 1656–1670): fällig, solange eine eingeführte Kandidatin älter als 24 h ist und **noch keinen Namen hat**. Den Namen setzt nur der Nutzer im Chat (`CoachScreen.jsx:505`, `status: 'named'`). Reagiert er nicht, bleibt sie **in jedem Turn** fällig.
- **Befund A4 (Taktung):** Der Mechanismus-Block fällt **immer** auf Antwort 9. Die Prüfung vor Antwort 9 wäre damit **immer** `check_skip`, außer der Mensch beendet vorher. Ein Fenster ab Antwort 3 verliert Antwort 5 (`window_skip`).
- **Befund A5:** Bei einer offenen Namensgebung kollidiert **jeder** Turn. Wer eine Stimme nicht benennt, bekommt keine Buch-Bezüge, solange das so bleibt.
- **Zeitliche Reihenfolge:** Die Stimmen-Abfragen laufen **nach** der Krisenerkennung und vor dem Prompt-Bau (Z. 1633 ff.). Der Kontext (`loadCoachContext`) startet schon früher (Z. 1473). „Kollision“ steht also erst kurz vor dem Prompt-Bau fest (siehe A6).

## 5. Modell und Hilfsfunktionen

- **Haiku-Konstante:** `HAIKU_MODEL` (`_shared/models.ts:30`, derzeit `claude-haiku-4-5-20251001`).
- **Helfer:** `extractText(response, label, logger)` und `ensureEndsWithUser` in `_shared/models.ts:39/62`. Einen **gemeinsamen** nicht-streamenden Helfer mit Timeout gibt es **nicht**. Vorbild ist `detectCrisis` (`chat/crisisDetection.ts:43–61`: `anthropic.messages.create`, `extractText`, Fence entfernen, `JSON.parse`, `catch` → sicherer Standard). Ein Timeout per `AbortController` gibt es bisher nur in `_shared/rag.ts:13–23` (OpenAI-`fetch`).
- **JSON-Parser:** nicht gemeinsam. Ich baue `parseSelection()` rein in `bookSelection.ts` (Fence entfernen, `JSON.parse` in `try`, ohne die Fehlermeldung zu loggen).
- **Token-Log:** Vorbild `coach_usage` (Z. 1773: `inputTokens`, `outputTokens`, `cacheReadTokens`, `stopReason`). Für den Auswahlschritt: `book_select_usage { label: 'chat_book_select', inputTokens, outputTokens, ms }`.

## 6. `loadCoachContext`

- **Ort:** Z. 960. Ein `Promise.all` mit sieben Abfragen: Akte, Personenprofil, Resonanzkarte, letztes anderes Gespräch (inkl. `open_thread_intensity`), Zähler, `conversation_context`, Supervision. Fehler werden je Abfrage gesammelt (`check(...)`) und blockieren nicht.
- **Neu dazu:** `profiles` (`book_status, book_progress, is_admin`) und das aktuelle Gespräch (`book_blocked, book_offered_reply, book_passage_ids`). Eine Abfrage auf `conversations` mit `id = convId` gibt es dort noch nicht. Sie kommt dazu.

## 7. Schutz-Trigger `protect_conversation_server_columns`

- **Letzte und einzige Fassung:** `023_session_counting.sql:79–105`, Sperrliste `session_counted_at`, `post_processed_at`, `post_processed_message_count`, Fehler `42501`.
- **Server passiert ihn** wie beim Profil: `if current_user not in ('authenticated', 'anon') then return new;`. Der Service-Client und SECURITY-DEFINER-Funktionen kommen durch.

## 8. Export

- **`EXPORT_TABLES`** in `supabase/functions/export-my-data/index.ts:30`, **`EXCLUDED_TABLES`** in Z. 56. Dort kommt `book_passages: 'keine Nutzerdaten (kuratierte Buchstellen)'` dazu.
- `conversations` wird mit `select('*')` exportiert. Die neuen Spalten sind dabei.

## 9. Frontend

- **Profil:** `useAuth.loadProfile` mit `select('*')`. `is_admin` und `book_status`/`book_progress` stehen im Profil.
- **`PatternDetailScreen.jsx`:** Z. 28–36 liest `pattern_references` (eigene, `pattern_key = key`). Muster-Texte kommen aus `getPattern(key)` (`src/lib/patterns.js`). Der Hinweis „Im Buch“ kommt als eigener kleiner Effekt daneben.
- **`book_page_viewed`:** `BookScreen.jsx` kennt `from` nur in `['profile', 'howto', 'today']`. `'mirror'` kommt dazu.

## 10. Tests

- **Node v24.15** führt `.ts` mit reinen Typangaben ohne Paket aus. Geprüft mit einer Test-Datei: `export type`, Parametertypen, `import … from './a.ts'`, `node --test` PASS.
- **Bedingung:** `bookSelection.ts` ohne Imports und ohne TS-Konstrukte, die Code erzeugen (kein `enum`, keine `namespace`, keine Parameter-Properties). Für Deno ist das unverändert gültig.
- **Glob neu:** `node --test "src/**/*.test.js" "supabase/functions/_shared/**/*.test.ts" "scripts/**/*.test.mjs"` (Seed-Skript-Test).

## 11. Landkarte

Die Datei liegt bei dir lokal als `docs/Neues_Zielbild/friedensstifter-buch-landkarte-v1.md` (nicht eingecheckt). Das Format habe ich gegen die Seed-Regeln im Handoff (3.2) geprüft:

- **Einträge:** 58 gesamt, davon `dialog` 28, `erklaerung` 13, `jerome` 17. 8 mit ⚠, 8 mit 🔒.
- **IDs:** Alle passen zum Muster `^(V-\d|T[1-7]-(D\d|E\d?|J\d?)|DD-\d|EP-\d)$`.
- **Pflichtfelder:**
  - Jeder Eintrag hat einen Kernsatz (58).
  - Jeder Eintrag hat genau eine Situation oder einen Inhalt (45 + 13).
  - Es gibt 8 Sonderregeln, also eine je ⚠-Eintrag.
- **Abweichung vom Handoff:** `**Kette:**` steht **in derselben Zeile** wie die Mechanismen (z. B. T1-E, Z. 98), nicht als eigene Zeile. Das Skript schneidet den Teil ab `· **Kette:**` ab.
- **Kopfzeile:** Die Datei sagt noch „Entwurf … **noch nicht von Jerome freigegeben**“. Beim Ablegen unter `docs/buch/buch-landkarte-v1.md` ändere ich diese eine Zeile auf „freigegeben am 21.11.2026 (B-8)“. An den Einträgen ändere ich nichts.
- **Erwartungen B1-f/B1-g** gegen die Landkarte geprüft:
  - `uebernahme_reflex` bis Teil 2 ist nur T2-J.
  - `rueckzug_unter_druck` ergibt T2-D3, T3-D3 und T7-D1 🔒. Bei `read` und `limit 2` sind das genau T2-D3 und T3-D3.

---

## 12. Abweichungen und Befunde (zur Bestätigung in J-B1)

| # | Handoff | Befund | Vorschlag |
|---|---|---|---|
| A1 | `book_blocked` beim Anlegen des Gesprächs | Das Gespräch legt der Client an | Setzen im Eröffnungs-Turn `start: 'wellness'` bei `score ≤ 3` |
| A2 | Krise: im Hintergrund setzen | passt | neben dem `crisis_events`-Insert, per `waitUntil`, Fehler geloggt |
| A3 | Prüfung „vor Antwort 3, 6, 9“ | Eröffnungs-Turns zählen als Antwort | Buch-Pfad nur bei echter Nutzernachricht, nie in `start`-Turns |
| **A4** | Prüf-Zeitpunkte 3, 6, 9 | **Mechanismus-Angebot fällt immer auf Antwort 5, 9, 13.** Die Prüfung vor 9 entfiele immer, ein Fenster ab 3 verliert Antwort 5 | **Jerome:** (a) Prüfungen vor **3, 6 und 8** (keine feste Kollision; Fenster ab 8 verliert nur Antwort 9) **oder** (b) bei 3, 6, 9 bleiben und in Kauf nehmen, dass effektiv nur 3 und 6 geprüft werden |
| **A5** | Kollision mit Stimmen | Offene Namensgebung ist **in jedem Turn** fällig, bis der Mensch benennt | **Jerome:** (a) so lassen, bestehende Funktion hat Vorrang (Vorschlag) **oder** (b) nur Einführung und Mechanismus zählen als Kollision, die Namensgebung nicht |
| A6 | Auswahlschritt parallel zu den übrigen Abfragen | Ob eine Kollision vorliegt, steht erst nach den Stimmen-Abfragen fest | Auswahlschritt startet parallel, sobald Profil und Gesprächszeile geladen sind. Steht danach eine Kollision fest, wird das Ergebnis **verworfen** (nicht gespeichert, Log `book_check_skipped`). Kosten: selten ein unnötiger Haiku-Aufruf, keine zusätzliche Wartezeit |
| A7 | `get_book_hints`: `not_authenticated` mit `28000` | Projektmuster `42501` (wie T1/A2) | `42501` |
| A8 | `logClientError('book_hints_failed')` | Gibt es nicht | `logger.warn('book_hints_failed', { code })` |
| **A9** | Monitor-Regel `id: 'book_usage'` | **Die ID ist seit T1 vergeben** (Client-Codes der Buch-Seite) | Neue IDs `book_chat_usage` und `book_select_error` (Server) und `book_hints_error` (`origin: 'client'`), alle mit `label` |
| A10 | Gemeinsamer Anthropic-Helfer | nicht vorhanden | Aufruf im Muster von `detectCrisis`, Timeout über die Option `timeout`/`signal` des SDK, ohne neuen Helfer in `_shared` (kein Scope) |
| A11 | Landkarte ablegen (J-B1, Jerome) | Datei liegt schon lokal, Format geprüft | Ich kopiere sie mit deinem OK nach `docs/buch/buch-landkarte-v1.md` und setze nur die Kopfzeile auf „freigegeben“ |

**Sonst:** keine Änderung an `post-conversation`, keine neue Abhängigkeit. Migrationen **045** und **046** sind frei.

---

## 13. J-B1 – Entscheidungen von Jerome (21.11.2026)

- **A4:** Variante a, geprüft wird vor den Antworten **3, 6 und 8** (`BOOK_CHECK_REPLIES`).
- **A5:** Variante a, auch die offene Namensgebung zählt als Kollision. Die bestehende Funktion hat Vorrang.
- **A1–A3 und A6–A11:** bestätigt.
- **E1–E7, B1-1 und B1-2:** bestätigt.
- **Texte aus Abschnitt 5:** freigegeben.
- **Landkarte:** nach `docs/buch/buch-landkarte-v1.md` kopiert, nur die Kopfzeile auf „freigegeben am 21.11.2026 (B-8)“ geändert.
