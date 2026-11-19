# Handoff U5a – Weiterarbeiten & Deine Einschätzung (v1.0, freigegeben)

**Für:** Claude Code · **Stand:** 19.11.2026 · **Basis:** `main` nach U4 (`3e4b1b65`)
**Konzept:** UX „Kreislauf“ v1.2, Abschnitte 4.1 (B/C2), 4.2c, 4.2d, 4.3a, 4.3c, 4.3d, 8.1 (Einschätzungs-Spalten), 8.5 · Umsetzungsplan v1.0, Tranche U5a
**Branch:** `u5a/weiterarbeiten` · ein Deploy: **Migration 039** + Edge Function `chat` + Frontend
**Bewusst nicht in U5a:** Lernen aus den Einschätzungen (`INSIGHT_PROMPT`, Resonanzkarte, Konfidenz, `follows_insight_id` befüllen, „Was du seitdem erlebt hast“) → U5b

> Aus der Code-Inventur. Punkte mit **[E-U5a-x]** weichen vom Konzept ab, füllen eine Lücke oder brauchen Jeromes Entscheidung. **Alle am 19.11.2026 von Jerome nach Empfehlung freigegeben.**

---

## 1. Inventur (Ist-Stand)

| Stelle | Ist | Folge für U5a |
|---|---|---|
| `chat` Start `resume` (U3) | Coach spricht zuerst in **diesem** Gespräch, Block FORTSETZUNG (Zeitbezug, Zusammenfassung, offener Faden, bei `high` ohne Thema), keine neue Konversation, keine neue Zählung | Weiterarbeiten baut darauf auf (gleicher Weg, anderer Block) |
| `chat` BLOCK 7 Entry-Kontext | Quellen `pattern`, `tagesimpuls`, `spiegel`, `verstehen`, `direct`; Texte kommen **vom Client** (`sanitizeEntryContext`, Längen begrenzt); Start `entry` legt **immer ein neues Gespräch** an | Weiterarbeiten braucht das Ursprungsgespräch → nicht über `entry` |
| `useChat.resumeWithOpening(convId)` | lädt Verlauf, `start: 'resume'` | um `insightId` erweitern |
| `insights` | `source`, `is_pinned`, `surfaced_at`, `confirmed_at`, `dismissed_at`; `conversation_id … ON DELETE SET NULL` | neue Spalten `user_rating`, `rated_at`, `follows_insight_id` (Migration 039) |
| Spiegel · Erkenntnisse (`InsightsLevel`) | Filter Alle/Erkenntnisse/Stärken/Vorhaben, Anheften, Entfernen, „Vorschlag – stimmt das?“ (U3) | „Deine Einschätzung ›“, „Daran weiterarbeiten →“, Filter ✦ |
| Spiegel · Entwicklung (`DevelopmentLevel`) | Zeitachse **aus `session_notes.file_updates`** (Akte-Änderungen des Coaches), keine Erkenntnisse | Einschätzung an diesen Einträgen hat keinen Speicherort → E-U5a-3 |
| Heute (`HiddenInsightCard`, `todayState`) | B: verdeckt, nach Antippen Text + „Stimmt das so?“ (bei `auto`) + „Heute nicht“; C2: verdeckt, nur Text | „Deine Einschätzung ›“, „Wie war es seitdem?“ / „Daran weiterarbeiten →“; Auswahl ohne `disagree`, C2 mit Vorrang ✦ |
| `ConversationEndModal` | Schritt 1 „Was nimmst du heute mit?“, Schritt 2 Vorhaben; nur bei „Neues Gespräch“ mit Vorschlag | Einschätzung nach einem Weiterarbeiten-Gespräch |
| `src/lib/insightActions.js` | confirm/adapt/dismiss/surface/remove, jeweils mit `.select('id')` | `rateInsight(id, rating \| null)` |
| Migrationsnummern | zuletzt **038** (U4) | U5a = **039** |

## 2. Abweichungen und Entscheidungen (Freigabe durch Jerome)

**[E-U5a-1] Weiterarbeiten = `start: 'resume'` mit `insightId`; den Inhalt lädt der Server.** Der Client schickt nur `{ conversationId, start: 'resume', insightId }`. `chat` lädt die Erkenntnis selbst (eigene Zeile, `conversation_id` = dieses Gespräch, nicht `disagree`; sonst `400 invalid_insight` bzw. `403`), dazu Kurztitel und Intensität des Gesprächs, und setzt statt FORTSETZUNG den Block **WEITERARBEITEN** nach Konzept 8.5: Zeitbezug (ab Entstehung der Erkenntnis) + Thema (bei `high` ohne Thema) · Erkenntnis wörtlich · genau eine Frage (bei `ziel`: „Wie ist es dir damit ergangen?“, bei `unclear`: Klärungsangebot) · Ausweg · keine Bewertung. Kein Erkenntnistext vom Client im Prompt (wie S-12). Logs `weiterarbeiten_started` / `weiterarbeiten_rejected` (nur IDs, Kategorie, Bewertung). Zählung wie beim Weitermachen: keine neue. **Empfehlung: so.**

**[E-U5a-2] Erkenntnisse ohne Ursprungsgespräch** (`conversation_id` leer, z. B. ältere Einträge). Audit: `supabase/diagnostics/u5a-audit.sql`.
- a) „Daran weiterarbeiten“ dort **nicht anbieten** (Einschätzung, Anpassen, Entfernen gehen weiter).
- b) Neues Gespräch mit Weiterarbeiten-Einstieg (zählt als Start, im Ruhemodus nicht möglich).
- **Empfehlung: a)** – das Konzept knüpft Weiterarbeiten bewusst an das Ursprungsgespräch; b) würde still einen Kennenlern-Start verbrauchen.

**[E-U5a-3] Zeitachse in „Entwicklung“.** Die Einträge dort sind Akte-Änderungen des Coaches ohne eigene Zeile; eine Einschätzung ließe sich nur mit einer neuen Tabelle speichern.
- **Empfehlung:** Mit ✦ markierte Erkenntnisse erscheinen **zusätzlich als eigene Einträge in der Zeitachse** („Hat mich weitergebracht: „…““, am Tag der Markierung). Der Filter **„Hat mich weitergebracht ✦“** in Entwicklung zeigt genau diese. Akte-Einträge selbst bekommen keine Einschätzung (später bei Bedarf).

**[E-U5a-4] „Deine Einschätzung“ – Bedienung.** An jeder Erkenntniskarte im Spiegel und auf Heute nach dem Aufdecken: Link „Deine Einschätzung ›“ öffnet ein Sheet mit ✦ Hat mich weitergebracht · ? Verstehe ich nicht · ≠ Teile ich nicht · ✎ Anpassen · ✕ Entfernen; die gewählte ist markiert, erneutes Tippen bzw. „Einschätzung zurücknehmen“ setzt sie zurück. Speichern mit bestätigtem Write, Fehler sichtbar.
- Sichtbar auf der Karte: **✦** bei „Hat mich weitergebracht“. Bei „Verstehe ich nicht“ der Hinweis „Magst du es im Gespräch klären? →“ (Weiterarbeiten mit Klärungs-Einstieg). Bei „Teile ich nicht“ die Angebote „In deinen Worten formulieren“ (Anpassen) und „Entfernen“; die Karte bleibt im Spiegel, erscheint aber nicht mehr auf Heute und nicht als Weiterarbeiten.
- **Empfehlung: so.**

**[E-U5a-5] Einschätzung im Abschluss nach einem Weiterarbeiten-Gespräch.** Einmalig und überspringbar: „Du hast heute an „…“ weitergearbeitet. Wie siehst du diese Erkenntnis jetzt?“ mit ✦ · Verstehe ich nicht · Teile ich nicht · Überspringen. Erscheint beim Verlassen über „Neues Gespräch“ **oder** „←“, wenn im Weiterarbeiten-Gespräch mindestens eine eigene Nachricht geschrieben wurde. Folgt danach noch „Was nimmst du heute mit?“, kommt das im selben Fenster als nächster Schritt. **Empfehlung: so.**

**[E-U5a-6] Heute.** B (Nachklang) nach dem Aufdecken: Text · „Stimmt das so?“ (nur `auto`) · „Deine Einschätzung ›“ · „Wie war es seitdem? Daran weiterarbeiten →“. C2 (Wiederentdecken): „Daran weiterarbeiten →“ und „Deine Einschätzung ›“. Auswahl: B und C2 ohne `user_rating = 'disagree'`; C2 mit Vorrang für ✦ (Konzept 8.1). **Empfehlung: so.**

**[E-U5a-7] Datenmodell (Migration 039).** `insights.user_rating text check in ('helpful','unclear','disagree')`, `rated_at timestamptz`, `follows_insight_id uuid references insights(id) on delete set null` (Spalte jetzt, befüllt erst in U5b). Der Client setzt `user_rating`/`rated_at` über die bestehende Update-Policy für eigene Erkenntnisse (inkl. MFA-Policy aus C-5). Export und Löschtest erfassen die Spalten automatisch. **Empfehlung: so.**

**[E-U5a-8] Kennenlernen/Ruhemodus.** Weiterarbeiten setzt das Ursprungsgespräch fort und verbraucht keinen Start, auch im Ruhemodus. Ist das Gespräch an der Kappungsgrenze, erscheint der Hinweis aus U4. **Empfehlung: so** (entspricht Konzept 5.3).

## 3. Umsetzung (nach Freigabe)

- **Migration 039** nach E-U5a-7, mit Kommentar zum Rückgängigmachen.
- **`chat`:** `insightId` bei `start: 'resume'` (UUID-Prüfung, Eigentum, Gesprächszugehörigkeit, nicht `disagree`), Block WEITERARBEITEN, Log-Codes + `monitorRules.ts` (infoOnly).
- **Frontend:**
  - `insightActions.rateInsight`
  - `components/insights/RatingSheet.jsx` („Deine Einschätzung“), `RatingFollowUp` (Klären / Formulieren / Entfernen)
  - `InsightsLevel`: Einschätzung, ✦, Filter ✦, „Daran weiterarbeiten →“
  - `DevelopmentLevel`: ✦-Einträge in der Zeitachse, Filter
  - `HiddenInsightCard` + `todayState` (E-U5a-6)
  - `useChat.resumeWithOpening(convId, { insightId })`, `CoachScreen` Start-Variante „weiterarbeiten“ (Navigation-State `{ continueInsight: { insightId, conversationId } }`), Abschluss-Einschätzung (E-U5a-5)
- **Angriffstest:** Weiterarbeiten mit fremder `insightId` → 403/400 · eigene `insightId` mit anderem Gespräch → 400 · `user_rating` mit ungültigem Wert → Fehler (Check) · Einschätzung an fremder Erkenntnis → 0 Zeilen.
- Sprachprinzip-Prüfung aller neuen Texte.

## 4. Deploy-Reihenfolge (J-U5a)
1. Mergen, Vercel-Deploy abwarten, einmal neu laden.
2. Backup, `supabase db push`, `notify pgrst, 'reload schema';`
3. `supabase functions deploy chat security-monitor admin-security --no-verify-jwt`
4. `npm run security:test`, dann Test in der App (Testkonto A).

## 5. Designdokument nach Verifikation
`ARCHITECTURE.md` (insights-Spalten, `chat` Start `resume` + `insightId`, Spiegel, Heute, Abschluss), `CLAUDE.md` (Schema, Migration 039, Begriffe „Deine Einschätzung“, „Daran weiterarbeiten“) – erst nach Jeromes Validierung.

## 5a. Bauhinweise (19.11.2026)

- **Weiterarbeiten:** Navigation-State `{ continueInsight: { insightId, conversationId, content } }` (`content` nur für die Anzeige im Abschluss); `CoachScreen` startet `resumeWithOpening(convId, { insightId })`. Der Server prüft Eigentum, Gesprächszugehörigkeit und „Teile ich nicht“ und baut den Block WEITERARBEITEN (ersetzt FORTSETZUNG). Zeitbezug ab Entstehung der Erkenntnis, Thema = Kurztitel (Platzhalter → kein Thema), bei `high` ohne Thema.
- **Bedienung:** `components/insights/InsightRating.jsx` (Link „Deine Einschätzung ›“, Sheet mit ✦ / ? / ≠ / Anpassen / Entfernen / zurücknehmen, Weiterarbeiten-Link, Folgeangebote bei „Verstehe ich nicht“ und „Teile ich nicht“). Gleiche Komponente im Spiegel und auf Heute.
- **Abschluss:** `ContinueRatingSheet` erscheint bei „Neues Gespräch“ oder „←“, wenn im Weiterarbeiten-Gespräch selbst geschrieben wurde; danach läuft der bisherige Ablauf (Abschluss-Modal, neues Gespräch bzw. Einstieg).
- **Zeitachse:** ✦-Erkenntnisse als Einträge am Tag der Markierung (`rated_at`); Filter erscheint nur, wenn es solche Einträge gibt.
- **Neue Log-Codes:** `weiterarbeiten_started`, `weiterarbeiten_rejected` (infoOnly).

## 5b. Validierung und Doku

- 19.11.2026 von Jerome validiert: Angriffstest 161 / 157 PASS / 0 FAIL (U5a-a … U5a-e grün), Einschätzung, Filter, Weiterarbeiten-Einstieg, Klärungs-Einstieg, Abschluss-Einschätzung, „Teile ich nicht“.
- Nachbesserung (`u5a/nachbesserung`): Das Modell übernahm beim Weiterarbeiten den Ton der Standard-Eröffnung aus dem Verlauf → FORTSETZUNG/WEITERARBEITEN als **letzter** Prompt-Block, synthetischer Nutzer-Turn mit gezieltem Hinweis (`ensureEndsWithUser(…, hint)`).
- Doku nachgezogen (`u5a/doku`): `ARCHITECTURE.md` (Stand, Struktur, Spiegel, Heute, Prompt-Reihenfolge, Weiterarbeiten, Einstiegs-Flow, insights-Schema), `CLAUDE.md` (Prompt-Reihenfolge, Weiterarbeiten, useChat, Schema, Migration 039, Begriffe).

## 6. Beobachtungen
- `follows_insight_id` ist wie alle Spalten von `insights` für den Client änderbar (Tabellen-Grant aus 025). Lesen fremder Erkenntnisse ist dadurch nicht möglich (RLS); befüllt wird die Spalte ab U5b serverseitig. Falls gewünscht, kann U5b die Spalte per Policy-Check auf eigene Erkenntnisse beschränken.
