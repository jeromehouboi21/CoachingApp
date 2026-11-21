# B1 Buch-Bezüge – Bestandsaufnahme für das Handoff

**Für:** den Design-Chat, der das Handoff B1 schreibt · **Von:** Claude Code · **Stand:** 21.11.2026, `main` nach T1 (`3e100ba0`)
**Grundlage:** Konzept `friedensstifter-konzept-buch-bezuege-v1.md` v1.1 (Abschnitte 3–5, 7), Buch-Landkarte `friedensstifter-buch-landkarte-v1.md`
**Entscheidungen von Jerome (21.11.2026):**
- **B-8:** Landkarte vollständig freigegeben, alle 58 Einträge inkl. ⚠ und Sonderregeln.
- **B-9:** Wörtliche Buchzitate mit „muss“ sind als Zitat erlaubt.
- **Konzept:** ohne Anmerkungen bestätigt.
- **Reihenfolge:** B1 kommt direkt nach T1, vor Security-Paket V.

**Kurz:** B1 passt gut in den bestehenden Aufbau. **Drei Befunde** brauchen eine Entscheidung im Handoff (Abschnitt 9):
1. Der Wellness-Wert ist nach der Eröffnung nicht mehr bekannt.
2. Muster des laufenden Gesprächs gibt es erst nach dem Gespräch.
3. Nur 17 von 58 Einträgen haben einen Muster-Schlüssel der App.

---

## 1. Ausgangslage nach T1

- **Buch-Status:** `profiles.book_status` (`read` · `reading` · `not_yet` · null), `book_progress` 1–7 (nur bei `reading`), `book_status_at` (Migration 044). Schreiben nur über die RPC `set_book_status`. Die Spalten stehen auf der Sperrliste des Schutz-Triggers.
- **Schalter:** `BOOK_REFERENCES_LIVE = false` in `src/content/book.js`. B1 stellt ihn auf `true`. Dann verschwindet der Hinweis auf der Buch-Seite, und „Wie es funktioniert“ zeigt die zweite Textfassung. Beides ist schon gebaut.
- **Positionen:** Für `book_progress` gilt laut T1-3:
  - Position 0 (Vorweg) sehen alle Leser.
  - Position 6 schließt „Davor und danach“ ein.
  - Position 8 (Epilog) nur bei `read`.
  - Ob 🔒-Einträge aus dem aktuellen Teil schon erlaubt sind (T1-8: der Teil, in dem man gerade ist), legt das Handoff B1 fest.
- **Nächste freie Migration:** **045**.

## 2. Wo der Prompt entsteht (`supabase/functions/chat/index.ts`)

| Stelle | Zeile | Bedeutung für B1 |
|---|---|---|
| `buildSystemPrompt(...)` | 631 | 12 Parameter, Blöcke werden als Text angehängt. Für BUCH-STELLEN braucht es einen neuen Parameter oder ein Options-Objekt. |
| Reihenfolge | 631–931 | BASE → Mechanismus-Angebot → Stimmen → BLOCK 1 Briefing → 2 Akte → 3 Resonanzkarte → 4 RAG → 5 Supervision → 6 Wellness → 7 Entry → **zuletzt** FORTSETZUNG/WEITERARBEITEN (Z. 925) |
| Regel „letzter Block“ | 925 | FORTSETZUNG/WEITERARBEITEN **muss** der letzte Block bleiben (Lehre aus U5a). BUCH-STELLEN gehört **davor**, am besten nach BLOCK 7. |
| Krisenfall | 1479–1485, 1678 | `crisisDetected` → `CRISIS_RESPONSE_BLOCK` statt `buildSystemPrompt`. Ohne Buch, das ist schon so. |
| Howto-FAQ | 1680 | `HOWTO_SYSTEM_PROMPT`, ohne Buch (B-4). Nichts zu tun. |
| Kontext laden | `loadCoachContext` Z. 960, Aufruf Z. 1473 | Lädt Akte, Profil, Resonanzkarte, letztes Gespräch (inkl. `open_thread_intensity`), RAG und Supervision **parallel** zum Speichern. Die Buch-Auswahl gehört hierher (eine Abfrage mehr in `Promise.all`). |
| Verlauf | `MAX_MESSAGES = 60` (Z. 1140), `assistantTurnCount` (Z. 1469) | Die Bedingung „mindestens 4 Nachrichten“ ist ohne Abfrage prüfbar (`history.length`). |
| Taktung im selben Turn | `offerMechanism` (Mechanismus-Angebot), `introduceVoice`/`namingVoice` (Stimmen) | Es gibt schon zwei getaktete Zusatzblöcke. Das Handoff legt fest, ob Buch-Stellen im selben Turn wie ein Stimmen- oder Mechanismus-Block kommen dürfen. Vorschlag: nicht im selben Turn. |
| Profil | `chat` liest `profiles` bisher nur in `requireConsent` (`_shared/consent.ts:16`, feste Spaltenliste) | `book_status`/`book_progress` brauchen eine Abfrage mehr. Möglich in `loadCoachContext` oder durch eine erweiterte Spaltenliste in `requireConsent` (die gehört aber fachlich zur Zustimmung, deshalb besser getrennt). |
| Modell | `COACH_MODEL` (`_shared/models.ts`), `effort` konstant pro Function | Unverändert. Nur Tokens kommen dazu (Konzept: 200–400 pro Aufruf, nur wenn der Block aktiv ist). |

## 3. Sicherheitsregel 4 („nicht im Ausnahmezustand“): was es heute gibt

| Bedingung im Konzept | Heute verfügbar? | Befund |
|---|---|---|
| Krisenhinweis in **dieser** Nachricht | ja, `crisisDetected` (Z. 1479) | Krisenantwort ohne Buch, ist schon so |
| Krisenhinweis **früher in diesem Gespräch** | ja, Tabelle `crisis_events` mit `conversation_id` | eine Abfrage (Zähler) pro Turn, oder einmal pro Gespräch merken |
| `open_thread_intensity = 'high'` | ja, für das **letzte andere** Gespräch in `loadCoachContext` (Z. 980), für das **eigene** beim Fortsetzen (Z. 1412) | vorhanden |
| **Wellness-Wert ≤ 3** | **nur im Eröffnungs-Turn** (`b.wellnessCheck`, Z. 1247). Er wird **nirgends gespeichert**. Spätere Turns schicken nur `{ conversationId, message }` | **Befund 1:** Ab der ersten Nutzernachricht ist der Wert unbekannt. Die Regel lässt sich so nicht prüfen (siehe Entscheidung E1) |

## 4. Auswahl der Stellen: was zur Verfügung steht

**Konzept 5.2:** Auswahl über `pattern_keys` aus `coach_file_entries` und `pattern_references` sowie über `themes`, ohne neuen Datenfluss.

| Quelle | Inhalt | Befund |
|---|---|---|
| `pattern_references.pattern_key` | die 5 festen Muster-Schlüssel (`src/lib/patterns.js`) | Werden von `post-conversation` geschrieben (Z. 750–765). **Erst nach dem Gespräch:** Der Client ruft `post-conversation` beim Verlassen oder Verstecken der Seite auf (`CoachScreen.jsx:334`), idempotent je Nachrichtenzahl. **Befund 2:** Im laufenden Gespräch stehen dort nur Muster aus **früheren** Gesprächen, bei einem Erstgespräch gar keine. |
| `coach_file_entries` | `category` (`pattern` · `strength` · `theme` · `value` · `trigger`), `label` als **Freitext** | Es gibt **keinen** `pattern_key`. Akte-Muster und `pattern_references` sind nicht verknüpft (CLAUDE.md, Abschnitt 6). Ein Abgleich mit `book_passages.themes` ginge nur über Text. |
| Entry-Kontext | `entryContext.source = 'pattern'` mit `topicKey` (Z. 581, 1127), gesetzt aus dem Muster-Detail „Darüber sprechen“ | Der **einzige** Muster-Schlüssel, der für das **laufende** Gespräch sicher bekannt ist. Er wird nur im Start-Turn mitgeschickt und nicht gespeichert. |
| Mechanismen und Themen der Landkarte | z. B. `fernbedienung`, `gedankenlesen`; Themen als deutsche Wörter | In der App gibt es **keine** Erkennung dafür. Der Mechanismus-Block im Prompt (Z. 292) ist freier Text ohne Schlüssel. |

**Abdeckung der Landkarte** (gezählt): **17 von 58 Einträgen** tragen mindestens einen der 5 Muster-Schlüssel, vor allem `uebernahme_reflex` und `harmonie_um_jeden_preis`. Die übrigen 41 haben nur Mechanismen und Themen. **Befund 3:** Eine Auswahl nur über Muster-Schlüssel erreicht knapp 30 % der Stellen (siehe Entscheidung E2).

## 5. Merken, ob ein Bezug genutzt wurde

- **`conversations`** hat einen Schutz-Trigger für server-eigene Spalten (`protect_conversation_server_columns`, `023_session_counting.sql:79`). Eine neue Spalte wie `book_reference_used` gehört dort auf die Sperrliste, nach dem Muster von T1.
- **`post-conversation`:** Die Modellaufrufe laufen parallel (Z. 454: Session-Notes, Akte, Profil, **anonyme Zusammenfassung**, Reflexion, Resonanzkarte).
  - **Achtung, Trennungsregel:** Die anonyme Zusammenfassung befüllt die Lernbasis und liefert `pattern_references`. Laut CLAUDE.md bekommen Prompts für `experience_patterns` **keine** personenbezogenen Daten. Buch-Status, Lesestand und mitgegebene Stellen gehören dort **nicht** hinein.
  - Eine Erkennung „Buchbezug genutzt“ gehört in einen personenbezogenen Prompt (z. B. Session-Notes) oder in `chat` selbst.
- **In `chat` selbst:** Die Antwort wird serverseitig zu Ende gestreamt und gespeichert (Z. 1745 ff.). Eine einfache Prüfung ist möglich, ob die Antwort einen mitgegebenen Szenentitel oder Kernsatz enthält. Sie ist ungenau, weil der Coach laut Haltung 1 erst fragt und die Szene oft nicht wörtlich nennt (Entscheidung E3).

## 6. Spiegel: Hinweis „Im Buch“ im Muster-Detail

- **`PatternDetailScreen.jsx`** (`/mirror/muster/:key`) liest `pattern_references` direkt per PostgREST (Z. 28–36). Muster-Texte kommen statisch aus `src/lib/patterns.js`.
- **`book_passages`** ist laut Konzept nur für `service_role` lesbar. Das Frontend kommt also nicht direkt heran. Es gibt zwei Wege:
  - eine schmale RPC (`SECURITY DEFINER`, `search_path = ''`, zuerst `mfa_satisfied()`), die für **einen** `pattern_key` nur Teil, Teiltitel und Szenentitel freigegebener, aktiver Stellen liefert, gefiltert nach dem eigenen Buch-Status bzw. Lesestand
  - oder die Function `pre-session-briefing` bzw. eine eigene Function
- **Regel aus CLAUDE.md:** Buchinhalte kommen nur aus `book_passages`, keine Buchtexte im Frontend-Code. Szenentitel über eine RPC sind damit vereinbar. Eine statische Liste im Frontend wäre es nicht.
- **Offen fürs Handoff:**
  - ⚠-Einträge im Spiegel zeigen oder nicht (Vorschlag: nicht, die Sonderregel verlangt, dass der Nutzer das Thema selbst anspricht)
  - 🔒-Einträge bei `reading` zeigen oder nicht

## 7. Zusammenspiel mit anderen Paketen

| Paket | Berührung | Hinweis fürs Handoff |
|---|---|---|
| **Security-Paket V** (kommt nach B1) | V2 legt alle **Lesewege des Frontends** über die Function `my-data`. V3 verschlüsselt u. a. `pattern_references` (`excerpt`) und `conversations` (`title`, `summary`, `open_thread`, `key_insight`). | Eine neue Client-RPC für den Spiegel erfasst V2 in der Bestandsaufnahme. Sie liefert keine persönlichen Inhalte, kann aber nach `my-data` wandern. `pattern_key` und Boolean-Spalten bleiben unverschlüsselt, die Auswahl funktioniert also weiter. **Migrationsnummern:** Der V-Handoff rechnet mit 042–046. Nach Z (042), R (043), T1 (044) und B1 (045) verschieben sie sich, das gleicht die Phase 0 von V ab. |
| **Lernbasis (S-13)** | Trennung personenbezogen ↔ Lernbasis | Kein Buch-Status und keine Buchstellen im Prompt der anonymen Zusammenfassung (Abschnitt 5) |
| **O1 Prompt-Caching** (später) | Reihenfolge der Blöcke | Der Buch-Block ist dynamisch (je Gespräch). Er steht hinter den festen Teilen, das passt zum Caching. |
| **Paket R / T1** | – | Keine Überschneidung. Schalter und Status sind schon da. |
| **Rundgang** | Text Schritt 3/4 | Keine Erwähnung des Buchs. Nichts zu tun. |

## 8. Datenschutz, Export, Löschen, Tests

- **`book_passages`:** keine Nutzerdaten. RLS an, nur `service_role` (Konzept 4). Kein Export, keine Löschregel. Bei Bedarf in `EXCLUDED_TABLES` von `export-my-data` mit Begründung „keine Nutzerdaten“.
- **Neue Spalte an `conversations`:** wird per `select('*')` automatisch exportiert und per CASCADE gelöscht.
- **Neue Tabelle mit Nutzerbezug** (z. B. „welche Stelle wurde wann genutzt“): Sie braucht eine CASCADE-Kette zu `profiles`/`conversations`, gehört in `EXPORT_TABLES` und in den Löschtest, ggf. in `apply_retention()`.
- **Logs:** Stellen-IDs wie `T3-D1` sind keine Inhalte und dürfen ins Log, als Zähler und Kennungen. Kernsätze, Titel und Situationen nicht (Log-Regel: auch keine Buchzitate).
- **Seed:** 58 Einträge aus der freigegebenen Landkarte, alle mit `approved_by_jerome_at` (B-8). Als eigene Migration oder als Seed-Datei, das legt das Handoff fest. **Hinweis:** Die Kernsätze stehen dann im Repo (Migration). Das ist Jeromes eigenes Werk, aber das Repo darf nicht öffentlich werden.
- **Unit-Tests:** `npm test` läuft mit `node --test "src/**/*.test.js"`. Node ist v24 und kann `.ts`-Dateien ohne Zusatzpaket ausführen. Eine reine Auswahlfunktion **ohne Imports** (z. B. `supabase/functions/_shared/bookSelection.ts`) ließe sich so direkt testen: Glob erweitern, keine neue Abhängigkeit.
- **Angriffstest:** Tabelle `book_passages` als `authenticated`/`anon` nicht lesbar. Neue RPC mit fremdem bzw. ohne Status. Neue `conversations`-Spalte nicht vom Client setzbar.

## 9. Entscheidungen, die das Handoff treffen sollte

| # | Frage | Optionen |
|---|---|---|
| **E1** | Wellness ≤ 3 nach der Eröffnung (Befund 1) | (a) Gespräche mit Wellness-Start ganz ohne Buch · (b) beim Start serverseitig nur ein Merker „behutsam“ an `conversations` (Boolean, kein Wert) · (c) den Wert selbst speichern (Gesundheitsbezug, neue Speicherung, eher nicht) |
| **E2** | Auswahl der Stellen (Befunde 2 und 3) | (a) nur Muster-Schlüssel aus früheren Gesprächen + `topicKey` → wenige, sichere Treffer (17 Stellen) · (b) eine kompakte Liste geeigneter Stellen (Titel + „passt, wenn“) in den Prompt, das Modell wählt selbst, schützt aber über „höchstens 1, nur wenn passend“ (mehr Tokens, ca. 40 pro Stelle) · (c) ein kleiner Klassifizierungsschritt (Haiku) auf die letzten Nachrichten, der Mechanismen/Themen-Schlüssel liefert (mehr Latenz/Kosten, Anthropic ist schon Empfänger, also kein neuer Drittanbieter) · (d) `post-conversation` ergänzt künftig Mechanismen/Themen pro Gespräch (wirkt erst ab dem nächsten Gespräch) |
| **E3** | „Bezug genutzt“ merken | (a) `post-conversation` im personenbezogenen Prompt (Session-Notes) · (b) Prüfung in `chat` auf Titel/Kernsatz · (c) schon das **Angebot** zählen: Ist der Block einmal mitgegangen, kommt er in diesem Gespräch nicht wieder (einfach, robust, deckt Haltung 2 ab) |
| **E4** | Taktung | Buch-Block nicht im selben Turn wie Stimmen- oder Mechanismus-Block? Ab welcher Nachricht (Konzept: ≥ 4)? Wie viele Turns bleibt der Block, wenn der Coach ihn nicht nutzt? |
| **E5** | 🔒 bei `reading` | Auflösungen aus dem aktuellen Teil N erlaubt oder erst ab N+1 (T1-8) |
| **E6** | Spiegel-Hinweis | RPC (Abschnitt 6) vs. Function; ⚠ und 🔒 im Spiegel ja/nein |
| **E7** | Seed | Migration 045 mit allen Einträgen oder getrennt: Tabelle in 045, Daten als eigene Datei (`supabase/seed/…`) |

---

*Bestandsaufnahme B1 · Claude Code · 21.11.2026*
