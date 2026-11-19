# Friedensstifter – Zielbild & Umsetzungsplan v1.0

**Stand:** 19.11.2026
**Zweck:** Ein Dokument, das alle am 19.11. beschlossenen Konzepte zusammenführt und in umsetzbare Tranchen für Claude Code schneidet. Die Detailkonzepte bleiben die Referenz für das *Wie*, dieses Dokument regelt das *Was* und das *Wann*.

**Zusammengeführt aus:**
- `claude/friedensstifter-ux-konzept-kreislauf-v1.md` (v1.2): Navigation, Screens, Geschäftsmodell
- `claude/friedensstifter-konzept-buch-bezuege-v1.md` (v1.1): Buch-Seite, Buch-Bezüge
- `claude/friedensstifter-buch-landkarte-v1.md` (v1.0): 58 Buchstellen, wartet auf Jeromes Prüfung
- `claude/handoff-modellwechsel-sonnet-5-5.md`: Modellwechsel, Frist 30.11.
- `claude/friedensstifter-security-umsetzungsstand-2026-11-19.md`: Paket C steht als Nächstes an

---

## 0. Spielregeln

### 0.1 Drei Dokumentarten, drei Rollen

| Dokument | Rolle | Wann geändert |
|---|---|---|
| **Konzepte** (UX, Buch, Landkarte) | Zielbild im Detail: was und warum | bei neuen Entscheidungen |
| **Handoffs** (eins pro Tranche) | Bauanleitung für Claude Code: BEFORE/AFTER, Migration, Checkliste | **just in time**, kurz vor der Tranche, gegen den aktuellen Code |
| **Designdokument** (v3.x) | Abbild des **verifizierten** Ist-Stands | **erst nach** der Validierung einer Tranche |

Das Designdokument wird **nicht** vorab auf das Zielbild umgeschrieben. Das ist die Lehre aus v3.1: Ein Abschnitt, der nach Plan klingt, ist noch kein Code. Jedes Handoff endet deshalb mit einem Abschnitt „Designdokument nach Verifikation", der genau beschreibt, welche Abschnitte danach angepasst werden.

### 0.2 Warum die Handoffs nicht alle auf einmal entstehen

Jede Tranche verändert den Code, auf dem die nächste aufsetzt. Ein Handoff, das heute für Tranche U4 geschrieben wird, beschreibt BEFORE-Blöcke, die es nach U1 bis U3 so nicht mehr gibt. Deshalb gilt: **Das Handoff für die nächste Tranche entsteht, wenn die vorherige verifiziert ist.** Grundlage dafür sind die Inventur von Claude Code oder ein aktueller Code-Export.

### 0.3 Definition of Done je Tranche

1. Claude Code macht eine **Inventur** der betroffenen Stellen und meldet Abweichungen vom Handoff, **bevor** es ändert.
2. Die Umsetzung erfolgt auf **einem Branch mit einem Deploy**, ohne Arbeiten aus anderen Tranchen.
3. Die Checkliste „Vor dem Deploy" im Handoff ist grün, und `npm run security:test` meldet weiter alles PASS.
4. Jerome validiert mit einem **Testkonto** (keine Echtdaten, S-17) nach der Checkliste „Nach dem Deploy".
5. Claude Code aktualisiert das **Designdokument** nach Vorgabe des Handoffs und vermerkt das im Changelog.
6. Erst danach beginnt die nächste Tranche.

### 0.4 Leitsatz und Prüffragen (gelten für jede Tranche)

> **Die App ist ein Begleiter, der dich mit der Zeit kennenlernt, und kein Programm, das du abarbeitest. Sie hält fest, was du erkannt hast, damit es nicht verloren geht. Sie lädt ein, daran weiterzuarbeiten, und sie bewertet nichts. Bewerten tust nur du. Das Ziel ist, dass du wieder mehr Einfluss auf dein Leben spürst.**

1. **Lädt sie ein, oder drängt sie?** Nur einladen ist erlaubt.
2. **Wer bewertet?** Nur der Nutzer.
3. **Hilft sie, sich zu erinnern und daran weiterzuarbeiten?**

---

## 1. Alle Entscheidungen auf einen Blick

| # | Thema | Entscheidung | Quelle |
|---|---|---|---|
| E-01 | Grundrichtung | Vorschlag 3 „Kreislauf" mit Gesprächseinstieg aus Vorschlag 1 | UX 0 |
| E-02 | Navigation | 3 Tabs: **Heute · Gespräch · Spiegel**. Profil über den Avatar | UX 3.1 |
| E-03 | Spiegel | 3 Ebenen: **Erkenntnisse · Muster · Entwicklung**. Muster an einem Ort zusammengeführt | UX 4.3 |
| E-04 | Erkenntnis auf Heute | **verdeckt**, Antippen zum Anzeigen, Erklärzeile dauerhaft sichtbar | UX 4.1 |
| E-05 | Reflexionssträhne | wird **Reflexionstage** im Profil (gesamt, ohne Flamme) | UX 4.4 |
| E-06 | Kreislauf-Leiste | **keine**. Erklärung nur in „Wie es funktioniert" | UX 4.1 |
| E-07 | Wertfreiheit | keine Wertungsfarben, keine Konfidenz-Punkte, kein „Aufgelöst" | UX 4.3c |
| E-08 | Bewertung | **nur durch den Nutzer**: ✦ Hat mich weitergebracht · Verstehe ich nicht · Teile ich nicht · Anpassen · Entfernen | UX 4.3d |
| E-09 | Lernen | Einschätzungen verbessern künftige Erkenntnisse (alle) und den Gesprächsstil (Resonanzkarte) | UX 8.6 |
| E-10 | Weiterarbeiten | im **Ursprungsgespräch**, Einstieg wie in einer Folgesitzung | UX 4.2d |
| E-11 | Wiederentdecken | ältere Erkenntnisse gelegentlich auf Heute (höchstens einmal pro Woche) | UX 4.1 C2 |
| E-12 | Geschäftsmodell | **Kennenlernen** (3 Gespräche, ohne Zeitlimit) → **Ruhemodus** (alles Erkannte bleibt sichtbar) → **Begleitung** (Bezahlmodell, Preis später) | UX 5.3 |
| E-13 | Kappung | 100 Nachrichten pro Gespräch ohne Begleitung (Startwert) | UX 8.3 |
| E-14 | Werbung | **keine**. Nur eigene Empfehlung ohne Tracking (Coaching, Buch) | UX 5.2a |
| E-15 | Modell | Wechsel auf **Sonnet 5.5** vor dem 30.11., Haiku vorerst unverändert | Handoff M |
| E-16 | Effort | Start mit `medium`, Vergleich mit `high` in der Validierung | Handoff M, E-1 |
| B-01 | Kaufnachweis Buch | **nein**, Selbstauskunft | Buch 0 |
| B-02 | Schutz der Buchinhalte | über Coach-Regeln (kurze Zitate, kein Ende verraten, nur Landkarte) | Buch 3 |
| B-03 | Buch-Seite | **ja**, `/buch` | Buch 1 |
| B-04 | Buch im Chat | nur für Leser, nie als Werbung | Buch 0 |
| B-05 | Lesercode | **nein** | Buch 6 |
| B-06 | Lesestand | „Ich lese gerade" mit Auswahl „bis Teil N"; Bezüge nur bis dorthin | Buch 2 |

### Noch offen

| # | Frage | Bis wann | Blockiert |
|---|---|---|---|
| O-1 | `display_title`: eigene Spalte oder `title` überschreiben | Handoff U3 (Claude entscheidet nach Code-Inventur) | U3 |
| O-2 | Kappungsgrenze nach echten Token-Daten nachjustieren | nach T0 + 2 Wochen Logging | U4 (nur Feinjustierung) |
| O-3 | Text der Buch-Seite freigeben (B-7) | vor T1 | T1 |
| O-4 | Buch-Landkarte prüfen, 58 Einträge (B-8) | vor B1 | B1 |
| O-5 | Buchzitate vom Sprachprinzip ausnehmen (B-9) | vor B1 | B1 |
| O-6 | Taschenbuch-Link | ab 27.11. | T1 (Platzhalter „Erscheint am 27.11." reicht) |
| O-7 | Wireframes vor U2/U3 gewünscht? | vor U2 | – (empfohlen, nicht zwingend) |

---

## 2. Zielbild in Kürze

### 2.1 Navigation und Screens

```
                    (JH) → Profil
┌──────────────┬──────────────┬──────────────┐
│    Heute     │   Gespräch   │   Spiegel    │
├──────────────┼──────────────┼──────────────┤
│ A Neu        │ Einstieg:    │ Erkenntnisse │
│ B Nachklang  │  Weitermachen│ Muster       │
│ C Ruhe /     │  Etwas Neues │  (Stimmen,   │
│   C2 Wieder- │  Ankommen    │   Muster,    │
│   entdecken  │ Chat         │   Bibliothek)│
│ D Schon      │ Abschluss →  │ Entwicklung  │
│   gesprochen │  Vorhaben,   │  (Zeitachse) │
│              │  Einschätzung│              │
└──────────────┴──────────────┴──────────────┘
Zusätzlich: /buch · /coach/verlauf · /wellness · Redirects für alle alten Routen
```

### 2.2 Alle Datenmodell-Änderungen (Gesamtübersicht)

Alle Änderungen sind **additiv**. Die Migrationsnummern vergibt Claude Code fortlaufend nach dem Stand von Paket C (zuletzt geplant: 036).

| Tranche | Tabelle | Änderung |
|---|---|---|
| T1 | `profiles` | `book_status`, `book_progress`, `book_status_at` + RPC `set_book_status` + Freigabe im Schutz-Trigger |
| U3 | `insights` | `surfaced_at`, `confirmed_at`, `dismissed_at` |
| U3 | `conversations` | `display_title` (oder Nutzung von `title`, O-1) |
| U4 | `profiles` / `consume_session` | Zählung der Kennenlern-Starts gesamt statt monatlich, Bestandsnutzer-Reset |
| U5a | `insights` | `user_rating`, `rated_at`, `follows_insight_id` |
| B1 | `book_passages` (neu) | Landkarte + Seed |
| B1 | `conversations` | `book_reference_used` |

### 2.3 Alle Änderungen an Edge Functions und Prompts (Gesamtübersicht)

| Tranche | Function | Änderung |
|---|---|---|
| T0 | alle Sonnet-Aufrufer | Sonnet 5.5, `_shared/models.ts`, `ensureEndsWithUser`, `extractText`, Token-Logging |
| U3 | `post-conversation` | `display_title` in `SESSION_NOTES_PROMPT` |
| U3 | `chat` / `pre-session-briefing` | Fortsetzen ohne neuen Gesprächsstart, Einstiegsdaten (letzte 3 Gespräche) |
| U4 | `chat` | Kennenlern-Grenze, Kappung (`409 conversation_cap`), `access_phase` |
| U5a | `chat` | Entry-Kontext `weiterarbeiten` (BLOCK 7) |
| U5b | `post-conversation` | `INSIGHT_PROMPT` personenbezogen (aus dem anonymen Prompt herausgelöst), Einschätzungen → Resonanzkarte, Konfidenz-Anpassung, `follows_insight_id` |
| B1 | `chat` | Auswahl der Buchstellen, Block „BUCH-STELLEN" |

---

## 3. Die Tranchen

### 3.1 Reihenfolge

```
T0 Modellwechsel ──► T1 Buch-Seite ──► Paket C (Security) ──► U1 ──► U2 ──► U3 ──► U4 ──► U5a ──► U5b ──► B1 ──► O1
   Frist 30.11.       Ziel 27.11.       liegt vor
```

**Begründung der Reihenfolge:**
- **T0 zuerst:** harte Frist. Ohne T0 antwortet der Coach ab dem 1.12. nicht mehr.
- **T1 direkt danach:** klein, fast nur Frontend, passt zum Erscheinen des Taschenbuchs am 27.11. Unabhängig von allem anderen.
- **Paket C vor dem UX-Umbau:** liegt fertig vor und berührt dieselben Edge Functions. U4 (serverseitige Grenzen) setzt auf den gehärteten Stand auf.
- **U1 → U2 → U3:** vom Rahmen zum Inhalt. U1 baut die Navigation um, ohne Daten anzufassen. U2 baut den Spiegel um, ebenfalls ohne Migration. U3 bringt die ersten neuen Spalten.
- **U4 nach U3:** Die Kennenlern-Logik braucht das saubere Fortsetzen aus U3, damit Weitermachen nicht als neuer Start zählt.
- **U5 geteilt:** Die Oberfläche (U5a) wird getrennt vom Lernen in der Pipeline (U5b) ausgeliefert. U5b ändert Prompts und die Lern-Pipeline, also das Herzstück. Das braucht eine eigene, gut beobachtete Tranche.
- **B1 zuletzt:** wartet auf Jeromes Prüfung der Landkarte und profitiert vom neuen Spiegel (U2) für den Hinweis „Im Buch".

### 3.2 Übersicht

| Tranche | Inhalt | Größe | Risiko | Migration | Abhängig von | Handoff |
|---|---|---|---|---|---|---|
| **T0** | Modellwechsel Sonnet 5.5 | S | **hoch** (Frist, alle Gespräche) | nein | – | ✅ liegt vor |
| **T1** | Buch-Seite `/buch`, Buch-Status mit Lesestand, Profil-Karte | S | niedrig | ja (1) | T0 | ⬜ als Nächstes |
| **C** | Security-Paket C (C-1 bis C-5) | L | mittel | ja (3) | T0 | ✅ liegt vor |
| **U1** | Navigation: 3 Tabs, Avatar, Redirects, `/coach/verlauf`, Profil ohne Verlauf, Reflexionstage | M | niedrig | nein | C | ⬜ |
| **U2** | Spiegel: 3 Ebenen, Muster-Zusammenführung, Muster-Detail, wertfreie Darstellung, Spiegel-Sperren entfernen | M | mittel | nein | U1 | ⬜ |
| **U3** | Heute A–D + Wiederentdecken, Gesprächseinstieg, Fortsetzen ohne neuen Start, `display_title`, Vorhaben im Abschluss | L | mittel | ja (1–2) | U2 | ⬜ |
| **U4** | Kennenlernen → Ruhemodus → Begleitung, Kappung, Übergangstexte, Bestandsnutzer-Reset | M | **hoch** (serverseitige Grenzen) | ja (1) | U3 | ⬜ |
| **U5a** | Weiterarbeiten-Einstieg, Einschätzung (UI + Speichern), Abschluss mit Einschätzung | M | mittel | ja (1) | U4 | ⬜ |
| **U5b** | Lernen: `INSIGHT_PROMPT`, Einschätzungen → Resonanzkarte und Konfidenz, „Was du seitdem erlebt hast" | M | **hoch** (Lern-Pipeline) | nein | U5a | ⬜ |
| **B1** | Buch-Bezüge: `book_passages` + Seed, Auswahl in `chat`, Prompt-Block, „Im Buch" im Spiegel | M | mittel | ja (1) | U2, O-4, O-5 | ⬜ |
| **O1** | Optimierung: Haiku 5.5, Prompt-Caching | S | mittel | nein | U5b | ⬜ |

Größe: S ≈ 1 Tag, M ≈ 2–3 Tage, L ≈ 4–6 Tage Arbeit mit Claude Code, einschließlich Validierung.

### 3.3 Tranchen im Detail

#### T0 – Modellwechsel Sonnet 5.5 · Frist 30.11.
- **Handoff:** `claude/handoff-modellwechsel-sonnet-5-5.md` (liegt vor)
- **Kern:** `_shared/models.ts`, `between_tools` + `effort`, `ensureEndsWithUser`, `extractText`, `max_tokens` × 1,4, Token-Logging
- **Fertig, wenn:** alle Gesprächswege ohne 400 laufen, kein abgeschnittener Satz auftritt und Einträge `coach_usage` in `app_logs` stehen

#### T1 – Buch-Seite · Ziel 27.11.
- **Konzept:** Buch 1 und 2
- **Umfang:** Route `/buch` · Profil-Karte „Das Buch zur App" · Block in „Wie es funktioniert" · Migration `book_status`/`book_progress` · RPC `set_book_status` · Freigabe im Schutz-Trigger · einmalige Status-Karte auf Heute **noch nicht** (kommt mit U3, weil Heute erst dort neu gebaut wird)
- **Nicht enthalten:** Buch-Bezüge im Chat (B1)
- **Fertig, wenn:** die Seite erreichbar ist, der Status mit Lesestand gespeichert und wieder gelesen wird, der Kindle-Link öffnet und die CSP keine Meldungen zeigt
- **Vorab:** O-3, den Seitentext freigeben

#### C – Security-Paket C
- **Handoff:** `claude/handoff-security-paket-c.md` (liegt vor), Wellen C-1 bis C-5
- **Hinweis:** C-1 (Edge Functions fest in Frankfurt) berührt alle Function-Aufrufe. Sie setzt auf T0 auf.

#### U1 – Navigation
- **Konzept:** UX 3.1, 3.2, 4.4, 8.4
- **Umfang:** `BottomNav` auf 3 Tabs · Avatar-Button in `AppShell` · Redirects aller alten Routen · `/coach/verlauf` (bestehenden Verlauf aus dem Profil herauslösen) · Profil-Statistik mit Reflexionstage (Tage gesamt) · Strähnen-Balken auf Home ausblenden
- **Bewusst noch nicht:** neuer Inhalt von Heute (U3), neuer Spiegel (U2). Bis dahin zeigen die Tabs die bestehenden Screens unter neuem Namen.
- **Fertig, wenn:** alle alten Routen weiterleiten, keine Funktion unerreichbar ist und die Beta-Tester-Lesezeichen funktionieren

#### U2 – Spiegel
- **Konzept:** UX 4.3a–c, 6, 8.3 (Sperren entfernen)
- **Umfang:** Segment-Umschalter mit drei Ebenen · Ebene Muster mit Stimmen, persönlichen Mustern, Kandidat und Bibliothek · Muster-Detail `/mirror/muster/:key` (Verstehen-Detail + Momente + Verlauf) · Ebene Entwicklung (Zeitachse vorne, Stärken, Reaktionen, Alltag) · **wertfreie Darstellung** (Tabelle UX 4.3c) · Filter „Muster" in Erkenntnisse entfernen · Spiegel-Sperren entfernen (Tab-2-Gate, 10er-Limit, AusGesprächen-Lock)
- **Bewusst noch nicht:** Einschätzung, Filter ✦, „Daran weiterarbeiten" (U5a)
- **Fertig, wenn:** jedes Muster nur noch an einem Ort erscheint, es keine Wertungsfarben oder Konfidenz-Punkte mehr gibt und Free-Testkonten alles sehen

#### U3 – Heute & Gesprächseinstieg
- **Konzept:** UX 4.1, 4.2a–c, 8.1 (nur `surfaced_at`/`confirmed_at`/`dismissed_at`), 8.2; Buch 2 (Status-Karte)
- **Umfang:** Heute mit den Zuständen A–D und C2 · verdeckte Karte mit Erklärzeile · „Stimmt das so?" bei `source='auto'` · Gesprächseinstieg mit den letzten 3 Gesprächen, „Etwas Neues", „Ankommen" · Regeln, wann der Einstieg entfällt · **Fortsetzen ohne neuen `conversations`-Eintrag** (prüfen!) · `display_title` (O-1) · Abschluss-Modal mit Schritt „Magst du etwas ausprobieren?" (`ziel`) · Buch-Status-Karte nach dem ersten Gespräch · Wiederkehr-Begrüßung durch den Einstieg ersetzen
- **Wichtig aus T0:** Der Coach spricht beim Fortsetzen zuerst. Deshalb ist `ensureEndsWithUser` Pflicht.
- **Fertig, wenn:** jeder Zustand von Heute mit einem Testkonto erreichbar ist, auf Heute kein Gesprächsthema offen sichtbar ist und Weitermachen kein neues Gespräch anlegt

#### U4 – Kennenlernen, Ruhemodus, Kappung
- **Konzept:** UX 5.3, 5.4, 5.5, 8.3
- **Umfang:** `consume_session` zählt die Starts gesamt (Grenze `coalesce(session_limit, 3)`) · Kappung bei 100 Nachrichten ohne Begleitung → `409 conversation_cap` · `access_phase` für die Anzeige · die vier Übergangstexte · Info-Seite „Begleitung" (noch ohne Bezahlung) · Monats-Reset-Job für diese Zählung abschalten · Bestandsnutzer `free` auf 0
- **Sicherheit:** ausschließlich serverseitig durchgesetzt. Angriffstest um „4. Gespräch ohne Begleitung" und „101. Nachricht" erweitern.
- **Fertig, wenn:** der Angriffstest PASS meldet, ein Testkonto alle drei Phasen durchläuft und der Spiegel im Ruhemodus vollständig nutzbar bleibt

#### U5a – Weiterarbeiten & Einschätzung (Oberfläche)
- **Konzept:** UX 4.2c (Einschätzung im Abschluss), 4.2d, 4.3a (✦-Filter, Aktionen), 4.3d (UI), 8.1 (Einschätzungs-Spalten), 8.5
- **Umfang:** Entry-Kontext `weiterarbeiten` mit Prompt-Block · „Daran weiterarbeiten" an Erkenntnissen (Heute, Spiegel) öffnet das Ursprungsgespräch · Menü „Deine Einschätzung" · Speichern von `user_rating` · Filter ✦ in Erkenntnisse und Entwicklung · Einschätzung im Abschluss nach einem Weiterarbeiten-Gespräch · Regeln für „Teile ich nicht" (nicht wiederentdecken, nicht als Einstieg)
- **Bewusst noch nicht:** Lernen aus den Einschätzungen (U5b)
- **Fertig, wenn:** der Weiterarbeiten-Einstieg die vier Bausteine enthält (Zeitbezug, Zitat, eine Frage, Ausweg), keine Bewertung im Einstieg steckt und die Einschätzung sich ändern und zurücknehmen lässt

#### U5b – Lernen aus Einschätzungen
- **Konzept:** UX 4.2d (Selbstwirksamkeit), 8.5 (`follows_insight_id`), 8.6
- **Umfang:** `INSIGHT_PROMPT` personenbezogen (aus `ANONYMOUS_SUMMARY_PROMPT` herauslösen, damit kein Personenbezug in `experience_patterns` gelangt) · Einschätzungen als Beispiele im `INSIGHT_PROMPT` · Einschätzungen → `RESONANCE_UPDATE_PROMPT` · „Teile ich nicht" senkt die Konfidenz um 1 mit History-Eintrag · `follows_insight_id` · „Was du seitdem erlebt hast" in der Zeitachse
- **Risiko:** Hier wird das Herzstück verändert. Jeder DB-Write braucht einzelnes Error-Logging (Engineering-Regel), und die Pipeline-Läufe sind vor und nach dem Deploy in `app_logs` zu vergleichen.
- **Fertig, wenn:** ein Testgespräch alle Tabellen der Pipeline wie bisher befüllt, `experience_patterns` nachweislich keinen Personenbezug enthält und eine Einschätzung im nächsten Lauf als Input sichtbar ist

#### B1 – Buch-Bezüge
- **Konzept:** Buch 3–5, 7; Landkarte
- **Umfang:** Tabelle `book_passages` + Seed (nur freigegebene Einträge) · Auswahl der Stellen in `chat` (über Muster und Themen, kein neuer Embedding-Fluss) · Block „BUCH-STELLEN" mit allen Coach-Regeln · ⚠- und 🔒-Logik · `book_reference_used` · „Im Buch" im Muster-Detail
- **Vorab:** O-4 (Landkarte geprüft) und O-5 (Sprachprinzip bei Zitaten)
- **Fertig, wenn:** ein Leser-Testkonto höchstens einen Bezug pro Gespräch bekommt, ein Testkonto mit Status „Noch nicht" keinen und ein Testkonto „liest Teil 3" keinen Bezug auf Teil 4–8

#### O1 – Optimierung
- **Umfang:** Haiku 4.5 → Haiku 5.5 (gleicher Thinking-Default, `extractText` ist schon da) · Prompt-Caching des System-Prompts
- **Fertig, wenn:** die Kosten pro Gespräch laut Token-Logging messbar gesunken sind und die Pipeline unverändert befüllt wird

---

## 4. Wireframes (empfohlen vor U2)

Klickbare Wireframes für **Heute A–D + C2, Gesprächseinstieg, Spiegel mit drei Ebenen, Muster-Detail, Einschätzung**. Jerome prüft die Wirkung, bevor Code entsteht. Danach fließen die Wireframes als Referenz in die Handoffs U2 bis U5a ein. Das ist nicht zwingend nötig, spart aber erfahrungsgemäß Korrekturschleifen am Code.

---

## 5. Nächste Schritte

1. **Jerome:** T0 an Claude Code übergeben (heute oder morgen)
2. **Jerome:** O-3 (Seitentext Buch) freigeben, dann schreibt Claude das **Handoff T1**
3. **Claude Code:** T0 → T1 → Paket C
4. **Parallel Jerome:** Landkarte prüfen (O-4), Wireframes ja oder nein (O-7)
5. Nach Paket C: Handoff U1, gegen den dann aktuellen Code

---

*Zielbild & Umsetzungsplan v1.0 · erstellt mit Claude für Jerome Houboi · friedensstifter.coach*
