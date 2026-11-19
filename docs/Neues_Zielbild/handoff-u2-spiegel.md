# Handoff U2 – Spiegel (v1.0, freigegeben)

**Für:** Claude Code · **Stand:** 19.11.2026 · **Basis:** `main` nach U1 (`8536e354` + Doku `u1/doku`)
**Konzept:** UX „Kreislauf“ v1.2, Abschnitte 4.3, 4.3a–c, 5.3 (Tabelle), 6, 8.3 (letzter Punkt) · Umsetzungsplan v1.0, Tranche U2
**Branch:** `u2/spiegel` · ein Deploy, nur Frontend (Vercel), **keine Migration, keine Edge Function**

> Aus der Code-Inventur. Punkte mit **[E-U2-x]** weichen vom Konzept ab oder füllen eine Lücke. **Alle am 19.11.2026 von Jerome freigegeben**, einschließlich Entfernen der Sperre im Gesprächsverlauf (E-U2-7).

---

## 1. Inventur (Ist-Stand)

| Stelle | Ist |
|---|---|
| `src/screens/mirror/MirrorScreen.jsx` (605 Z.) | Zwei Tabs **Erkenntnisse** · **Deine Akte** (Schloss für Free). Erkenntnisse: Filter Alle · Muster · Stärken · Erkenntnisse · Ziele, Kategorie-Chips in vier Farben (Stärke grün, Ziel koralle …), Anheften/Löschen **ohne Fehlerprüfung**. Akte: Muster mit **Konfidenz-Punkten**, Status-Badges „Zeigt sich seltener“ (amber) / „Aufgelöst“ (grün), Stärken (grüne Überschrift, Punkte), Kontext, „Wie du reagierst“ (koralle), **Zeitachse farbcodiert** (Neu/Update/Aufgelöst) und nur für Premium; für Free je Bereich nur die erste Karte, Rest gedimmt + „Deine vollständige Akte freischalten“. Verlaufs-Sheet (`history`) |
| `src/screens/verstehen/VorstehenScreen.jsx` | Bibliothek mit 5 festen Mustern (`KNOWN_PATTERNS`), Filter Beziehungen/Arbeit/Selbstbild, Banner „Dein Coach hat bemerkt“ → `/verstehen/aus-gespraechen`, Label „Aus deinen Gesprächen“ |
| `src/screens/verstehen/MusterDetail.jsx` | Texte der 5 Muster (`PATTERN_DATA`: Untertitel, 3 Schritte, „Was hilft“, Prompt); zeigt **ein** persönliches Zitat (neueste `pattern_reference`); „Darüber sprechen →“ mit Entry-Kontext `pattern` |
| `src/screens/verstehen/AusGespraechen.jsx` | alle `pattern_references`; ab der 2. Karte gesperrt, wenn `plan !== 'premium'` (**sperrt auch Tester**) |
| `src/screens/stimmen/StimmenScreen.jsx` | ganzer Screen gesperrt ohne Premium/Tester; benannte Stimmen mit **Aktivitätspunkten**, Kandidaten (eingeführt) mit Akte-Verknüpfungen |
| `src/screens/home/HomeScreen.jsx` | Grid verlinkt `/stimmen` (Badge „PRO“) und `/verstehen` |
| `src/screens/premium/PremiumScreen.jsx` | Liste nennt „Bis zu 10 Erkenntnisse im Spiegel“, „Mein Spiegel: unbegrenzte Erkenntnisse“, „Innere Stimmen Modul“ |
| Server | **kein** 10er-Limit für Erkenntnisse und **keine** Plan-Sperre für Stimmen in `chat`/`post-conversation` – beides sind reine Anzeige-Sperren bzw. Werbetext |
| Datenmodell | `coach_file_entries` (Akte-Muster, freier `label`, `history`, `voice_id`) und `pattern_references` (5 feste `pattern_key`s) sind **nicht verknüpft** – es gibt kein gemeinsames Schlüsselfeld |

## 2. Abweichungen und Entscheidungen (Freigabe durch Jerome)

**[E-U2-1] Ebenen als Routen.** `/mirror` = Erkenntnisse, `/mirror/muster` = Muster, `/mirror/entwicklung` = Entwicklung (alle in der AppShell, Tab „Spiegel“ bleibt aktiv). Der Segment-Umschalter navigiert zwischen ihnen; so funktionieren Zurück-Taste und Lesezeichen. Weiterleitungen: `/verstehen`, `/verstehen/aus-gespraechen`, `/stimmen` → `/mirror/muster`; `/verstehen/:key` → `/mirror/muster/:key`. Das Home-Grid zeigt direkt auf die neuen Ziele, das Badge „PRO“ an „Innere Stimmen“ entfällt.

**[E-U2-2] Muster-Detail nur für die 5 Bibliotheks-Muster.** Weil Akte-Muster und `pattern_references` nicht verknüpft sind (Inventur), kann ein Detail nicht beides vereinen, ohne zu raten. Vorschlag:
- `/mirror/muster/:key` (5 Keys): Kurz erklärt (Untertitel) · **Deine Momente** (alle eigenen `pattern_references` dieses Keys, statt bisher nur das neueste Zitat) · Entstehung in 3 Schritten · Was hilft · „Darüber sprechen →“. Ohne eigene Momente entfällt der Abschnitt (Konzept 4.3b, letzter Satz).
- Akte-Muster (`coach_file_entries`, `category='pattern'`) öffnen weiter ein Sheet: Beschreibung, Beispiel, Verlauf (`history`), „gehört zu: <Stimme>“.
- Eine echte Verknüpfung (`pattern_key` an `coach_file_entries`) bräuchte Migration + Prompt-Änderung und gehört nicht in U2. Notiert als Beobachtung.

**[E-U2-3] Jedes Muster an genau einem Ort (Ebene Muster).**
1. **Deine Stimmen**: `inner_voices` `status='named'`, „zeigt sich bei: …“ (verknüpfte Akte-Labels), „Mit <Name> sprechen →“ (wie bisher `/coach`). Ohne Aktivitätspunkte.
2. **Was sich bei dir zeigt**: Akte-Muster (Sheet) **und** Bibliotheks-Muster mit eigenen Momenten (→ Detail). Statt Konfidenz-Punkten: Bibliothek „N Momente aus Gesprächen“ (Anzahl `pattern_references`), Akte „N Momente aus Gesprächen“ (Anzahl `history`-Einträge, mindestens 1). Status beschreibend (E-U2-4). „gehört zu: <Stimme>“ über `voice_id`.
3. **Kandidat** (eingeführt, noch unbenannt), dezent: „Da ist etwas, das sich wiederholt. Magst du es dir ansehen? Darüber reden →“. Nicht eingeführte Kandidaten bleiben unsichtbar (wie bisher).
4. **Kennst du das?**: die übrigen Bibliotheks-Muster (ohne eigene Momente) als Liste. Die Filter Beziehungen/Arbeit/Selbstbild entfallen (5 Einträge).

**[E-U2-4] Wertfreie Darstellung (Konzept-Tabelle 4.3c) – gilt im ganzen Spiegel.**
- Kategorie-Chips der Erkenntnisse in **einer** neutralen Farbe; Abschnittsüberschriften einheitlich `ink-3`.
- Keine Konfidenz- oder Aktivitätspunkte mehr.
- Status: `fading` → „seltener in den letzten Gesprächen“, `resolved` → „zeigt sich gerade kaum“, beide neutral (kein Grün/Amber). `active` ohne Zusatz.
- Zeitachse: ein Punkt in Akzentfarbe, keine Badges. Texte: `add` → „zum ersten Mal bemerkt“, `update` → „neue Beobachtung“, `resolve`/`resolved` → „zeigt sich gerade kaum“.
- **Stärken ohne ✦.** Die Skizze in 4.3c zeigt ✦ vor Stärken, die Regel daneben (und CLAUDE.md) sagt „✦ nur dort, wo der Nutzer selbst markiert hat“. Die Regel gilt; Stärken bekommen einen neutralen Punkt.
- `confidence` und `status` bleiben Sortierkriterien.

**[E-U2-5] Ebene Entwicklung** (bisher „Deine Akte“), Reihenfolge: Kopf „Was sich bei dir bewegt · Aus N Gesprächen“ (N = Anzahl `session_notes`) · **Deine Entwicklung** (Zeitachse, neueste oben) · **Deine Stärken** · **Wie du reagierst** (`trigger` + `value`) · **Dein Alltag** (`coachee_profile`, Hinweis „Wird aus deinen Gesprächen abgeleitet, du wirst nicht danach gefragt.“). Der Muster-Bereich der Akte zieht in die Ebene Muster. Nicht in U2: Filter ✦ (U5a), „Was du seitdem erlebt hast“ (U5b).

**[E-U2-6] Ebene Erkenntnisse.** Filter **Alle · Erkenntnisse · Stärken · Vorhaben** (`ziel` heißt in der Anzeige „Vorhaben“); `muster`-Erkenntnisse nur unter „Alle“. Anheften und Löschen bleiben. **Nicht in U2:** „Vorschlag – stimmt das?“ (kommt mit U3 zusammen mit „Stimmt das so?“ auf Heute), Einschätzung, ✦-Filter, „Daran weiterarbeiten“ (U5a).

**[E-U2-7] Alle Sperren im Spiegel entfallen** (Konzept 5.2/5.3): Akte-Gate und gedimmte Karten, Zeitachse nur Premium, AusGesprächen-Lock, **Stimmen-Sperre** (laut Tabelle 5.3 sind Stimmen in allen Phasen sichtbar). Auf `PremiumScreen` werden die drei dadurch falschen Zeilen gestrichen; die Seite selbst wird erst in U4 neu geschrieben.
Offen: Die Sperre im **Gesprächsverlauf** (`HistoryScreen`, nur neuestes Gespräch für Free) liegt nicht im Spiegel. Laut 5.3 ist „Gesprächsverlauf nachlesen“ in allen Phasen frei. **Vorschlag: in U2 mit entfernen** (reine Anzeige, gleiches Prinzip); sonst in U4.

**[E-U2-8] Kein stilles Scheitern im Spiegel.** Anheften/Löschen prüfen den Fehler, nehmen die Änderung im UI zurück und zeigen eine kurze Meldung. Ladefehler zeigen eine Meldung statt des Leerzustands. Logs nur mit Fehlercode.

**[E-U2-9] Wortwahl im Spiegel (aktives UI).** „Was dein Coach über dich weiß“ → „Was sich bei dir bewegt“; „Dein Coach hat bemerkt“ → „Deine Momente“; „Die Akte wächst mit dir“ → „Deine Entwicklung wächst mit dir“; „MODUL · MUSTER ERKENNEN“ entfällt; der falsche Hinweis „Ab dem dritten Gespräch wird sie sichtbar“ entfällt. Bibliothekstexte (`PATTERN_DATA`) bleiben inhaltlich unverändert.

## 3. Umfang (AFTER)

1. `src/lib/patterns.js` (neu): die 5 Bibliotheks-Muster an einer Stelle (heute doppelt in `VorstehenScreen` und `MusterDetail`).
2. `src/screens/mirror/`: `MirrorScreen.jsx` (Kopf + Segment-Umschalter + Ebene je Route), `InsightsLevel.jsx`, `PatternsLevel.jsx`, `DevelopmentLevel.jsx`, `PatternDetailScreen.jsx` (`/mirror/muster/:key`, Vollbild, Zurück → `/mirror/muster`), `FileEntrySheet.jsx` (Sheet für Akte-Muster).
3. `App.jsx`: Routen und Weiterleitungen nach E-U2-1.
4. `HomeScreen.jsx`: Grid-Ziele `/mirror/muster`, kein „PRO“.
5. `PremiumScreen.jsx`: drei Zeilen gestrichen (E-U2-7).
6. `HistoryScreen.jsx`: Sperre entfernt (falls E-U2-7 freigegeben).
7. Entfernt: `src/screens/verstehen/*`, `src/screens/stimmen/StimmenScreen.jsx` (Inhalte leben im Spiegel; Routen leiten weiter).
8. Entry-Kontexte (`pattern`, `verstehen`) und `updateStreak` beim Öffnen eines Muster-Details bleiben unverändert.

## 4. Vor dem Deploy (Claude Code)

- [ ] `npm run build` inkl. `postbuild` ohne Fehler
- [ ] `rg -n "ConfidenceIndicator|ActivityDots|Aufgelöst|#2D7A3A|isLocked|Premium entdecken" src/screens/mirror src/screens/history` → keine Treffer
- [ ] `rg -n "/verstehen|/stimmen" src` → nur Weiterleitungen in `App.jsx`
- [ ] Sprachprinzip-Audit aller neuen/geänderten Texte
- [ ] keine neue externe Ressource

## 5. Nach dem Deploy (Jerome, Testkonten)

- [ ] **Free-Testkonto** sieht alles: alle Erkenntnisse, ganze Entwicklung inkl. Zeitachse, Stimmen, alle Momente; keine Schlösser, keine gedimmten Karten
- [ ] Umschalter Erkenntnisse · Muster · Entwicklung; Zurück-Taste springt zur vorigen Ebene
- [ ] Jedes Muster erscheint nur einmal (Stimmen / Was sich bei dir zeigt / Kennst du das?)
- [ ] Keine Punkte, keine Grün/Amber-Wertung, kein „Aufgelöst“
- [ ] Muster-Detail mit eigenen Momenten; „Darüber sprechen →“ öffnet das Gespräch mit Musterbezug
- [ ] Alte Lesezeichen `/verstehen`, `/verstehen/innerer_kritiker`, `/verstehen/aus-gespraechen`, `/stimmen` landen im Spiegel
- [ ] Anheften/Löschen einer Erkenntnis funktioniert; Löschen ist nach Neuladen weg
- [ ] Gesprächsverlauf ohne Sperre (falls freigegeben)
- [ ] `npm run security:test` alles PASS

## 6. Designdokument nach Verifikation

- ARCHITECTURE.md: Routen-Tabelle, Abschnitt Spiegel (drei Ebenen, Detail, Sheet), Verstehen/Stimmen als Weiterleitungen, Freemium-Hinweise (keine Anzeige-Sperren im Spiegel)
- CLAUDE.md: Abschnitt 2 (Routen), Abschnitt 6 (Verstehen-Modul → Spiegel/Muster), Abschnitt 8 (Freemium-Tabelle: Spiegel ohne Grenze)
- Designdokument v3.x (bei Jerome): 7.2/7.3/7.5/7.7/7.9, Freemium

## 7. Beobachtungen (nicht Teil von U2)

- Akte-Muster und Bibliotheks-Muster sind nicht verknüpft (E-U2-2). Eine Verknüpfung über `pattern_key` an `coach_file_entries` wäre eine eigene kleine Tranche (Migration + `post-conversation`-Prompt).
- Mehrere Bibliothekstexte beschreiben den Nutzer direkt („Wenn es eng wird, ziehst du dich zurück“). Kein Verstoß gegen „du bist X“, aber für ein späteres Sprach-Review vormerken.
- `CoachScreen` speichert Erkenntnisse aus dem Abschluss-Modal selbst (`insights.insert`); unverändert, relevant für U3/U5a.
