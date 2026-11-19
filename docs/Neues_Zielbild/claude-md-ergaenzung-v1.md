# CLAUDE.md – Ergänzung „Zielbild 2026-11" (v1.0)

> **Einbau:** Diesen Block ans Ende der bestehenden `CLAUDE.md` im Repo `CoachingApp` anhängen. Regeln, die es dort schon gibt (z. B. die Log-Regel aus Paket A), **nicht doppeln**, sondern hier nur verweisen. Bei Widerspruch gilt die bestehende Sicherheitsregel. Der Widerspruch wird gemeldet, nicht still aufgelöst.

---

## Arbeitsweise in Tranchen

- Gearbeitet wird **eine Tranche nach der anderen**, so wie in `docs/umsetzungsplan.md` (bzw. im Projekt-Dokument „Zielbild & Umsetzungsplan") festgelegt. Eine Tranche bedeutet ein Handoff, einen Branch und einen Deploy.
- **Kein Scope Creep.** Was im Handoff nicht steht, wird nicht gebaut, auch nicht „wenn man schon mal dran ist". Fällt dir etwas auf, notiere es unter „Beobachtungen" am Ende des Handoffs.
- **Zuerst die Inventur.** Vor jeder Änderung die im Handoff genannten Stellen im Code suchen. Weicht der Code vom BEFORE-Block ab, **anhalten und melden**, nicht raten.
- **Das Designdokument bildet nur verifizierten Code ab.** Aktualisiert wird es erst, nachdem Jerome die Tranche validiert hat, und genau so, wie es der Abschnitt „Designdokument nach Verifikation" im Handoff vorgibt. Jede Änderung bekommt einen Changelog-Eintrag.
- **Migrationen** sind additiv und fortlaufend nummeriert. Jede Migration enthält einen Kommentar zum Rückgängigmachen. Neue Tabellen bekommen RLS und explizite GRANTs für `service_role` und, falls nötig, für `authenticated` (Lehre aus Migration 014/015).

## Produktregeln, die jede Oberfläche einhält

- **Sprachprinzip:** In UI-Texten, Prompts und Beispieltexten gibt es kein „müssen", kein absolutes „immer" oder „nie", kein „können nicht" und kein „Du brauchst …". Wörtliche Zitate aus Jeromes Buch (`book_passages.key_quote`) sind als Zitat ausgenommen.
- **Einladen statt drängen:** keine Streaks, keine Countdowns, keine Verknappung („nur noch heute"), keine gedimmten Teaser-Karten, keine roten Badges für Ungelesenes. Jedes Angebot hat einen sichtbaren Ausweg („Heute nicht", „Überspringen").
- **Wertfreiheit:** Die App bewertet nichts, was den Nutzer betrifft. Es gibt keine Wertungsfarben (grün = gut), keine Punkte oder Sterne als Konfidenz und keine Wörter wie „Aufgelöst", „Fortschritt" oder „geschafft" für Muster. Bewertungen setzt **nur der Nutzer** selbst (`insights.user_rating`, Markierung ✦).
- **Heute ist öffentlicher Raum:** Auf dem Screen Heute erscheinen **keine Gesprächsthemen** im Klartext. Erkenntnisse sind dort verdeckt und werden erst nach Antippen angezeigt, mit dauerhaft sichtbarer Erklärzeile.
- **Kein Coaching-Vokabular im aktiven UI** (Chat, Heute, Spiegel). Begriffe wie „systemisch", „Intervention" oder „Reframing" gehören nur in Info-Kontexte (Profil, „Wie es funktioniert").
- **Keine Werbung, kein Tracking:** Keine Werbe-, Analytics- oder Pixel-SDKs. Externe Links (z. B. Amazon) öffnen mit `rel="noopener noreferrer"`, ohne Affiliate-Parameter.

## Technische Regeln

- **Modell-IDs stehen nur in `supabase/functions/_shared/models.ts`.** Nirgends sonst Modellnamen als String.
- **Anthropic-Aufrufe:** Antwortinhalte nach `type` lesen (`extractText`), nie `content[0]`. Vor jedem Aufruf `ensureEndsWithUser`. Keine `temperature`, `top_p` oder `top_k` bei Sonnet 5.x. `effort` ist pro Function konstant.
- **Serverseitige Durchsetzung:** Gesprächsgrenzen (Kennenlernen, Kappung), Plan-Prüfungen und Admin-Rechte werden **in den Edge Functions** durchgesetzt. Das Frontend zeigt nur an (`access_phase`), es entscheidet nicht.
- **Keine stillen Fehler:** Jeder DB-Write wird auf einen Fehler geprüft und geloggt. Es gibt keine leeren `catch`-Blöcke, und das UI meldet Erfolg erst nach bestätigtem Write. Abgeschnittene Modellantworten (`stop_reason = 'max_tokens'`) werden geloggt.
- **Logs ohne Inhalte** (siehe bestehende Log-Regel, S-04): nur IDs, Zähler, Token-Zahlen und Fehlercodes. Keine Gesprächs- oder Erkenntnistexte, auch keine Buchzitate.
- **Personenbezug und Lernbasis trennen:** Prompts, die `experience_patterns` befüllen, bekommen **keine** personenbezogenen Daten. Einschätzungen, Erkenntnisse und Profilwissen gehen nur in personenbezogene Prompts (z. B. `INSIGHT_PROMPT`).
- **Buchinhalte nur aus `book_passages`:** Der Coach bekommt Buchstellen ausschließlich aus dieser Tabelle, und nur freigegebene Einträge (`approved_by_jerome_at` gesetzt). Keine Buchtexte im Code oder in Prompts hartkodieren.
- **Testen mit Testkonten:** Diagnose und Tests laufen mit synthetischen Testkonten, nicht mit Echtdaten (S-17). Nach jeder Tranche `npm run security:test`.

## Begriffe (UI ↔ Code)

| UI | Code / Route |
|---|---|
| Heute | `/` · `HomeScreen` |
| Gespräch | `/coach` · `CoachScreen`, Einstieg, `/coach/verlauf` |
| Spiegel: Erkenntnisse / Muster / Entwicklung | `/mirror` · `/mirror/muster/:key` |
| Deine Einschätzung | `insights.user_rating` (`helpful` · `unclear` · `disagree`) |
| Daran weiterarbeiten | Entry-Kontext `weiterarbeiten`, Ursprungsgespräch fortsetzen |
| Kennenlernen / Ruhemodus / Begleitung | `access_phase` (`kennenlernen` · `ruhemodus` · `begleitung`) |
| Reflexionstage | bisherige Streak-Daten, Anzeige „Tage gesamt" |
| Das Buch zur App | `/buch` · `profiles.book_status`, `book_progress` |
