# Friedensstifter – Konzept „Buch zur App" v1.1

**Status:** Konzept, Entscheidungen von Jerome eingearbeitet, noch kein Handoff
**Stand:** 19.11.2026
**Bezug:** UX-Konzept „Kreislauf" v1.2 (`claude/friedensstifter-ux-konzept-kreislauf-v1.md`), Buch-Landkarte v1.0 (`claude/friedensstifter-buch-landkarte-v1.md`)

**Das Buch:** *Friedensstifter – Zwei Nachbarn, ein Feldweg und sieben Gespräche* · Jerome Houboi · Selbstverlag, 1. Auflage November 2026 · ISBN 979-8141627217
- **E-Book (Kindle):** https://www.amazon.de/dp/B0HRZWBH1F (bereits erhältlich)
- **Taschenbuch:** ab 27.11.2026, Link folgt (`[Taschenbuch-Link]`)

### Changelog v1.1 (gegenüber v1.0)
1. Titel, ISBN und E-Book-Link eingetragen
2. **Lesercode verworfen** (Entscheidung B-5)
3. **„Ich lese gerade" mit Lesestand:** Der Nutzer stellt ein, bis zu welchem Teil er gelesen hat. Der Coach greift nur Stellen bis dorthin auf (B-6, Abschnitt 2)
4. **Buch-Landkarte erstellt:** 58 Einträge aus dem Manuskript, Kernsätze wörtlich geprüft, ⚠-Regeln für sensible Inhalte (Abschnitt 4)
5. Datenmodell `book_passages` an den tatsächlichen Aufbau des Buchs angepasst: drei Stimmen, Positionen 0–8, Brückenfrage, Fragen aus dem Buch
6. Text der Buch-Seite an das Buch angepasst

---

## 0. Leitidee und Entscheidungen

Das Buch und die App erzählen dieselbe Haltung auf zwei Wegen. Im Buch stellt Mara Fragen, und Tim hat für alles eine Erklärung. In der App stellt der Begleiter Fragen, und der Nutzer bringt seine Erklärungen mit. Wer das Buch gelesen hat, erkennt das wieder. Die App baut darauf eine Brücke: Der Coach kann gelegentlich an eine passende Szene oder an eine Geschichte aus Jeromes Leben erinnern.

**Warum das wirkt:** An einer Figur lässt sich ein Muster leichter erkennen als an sich selbst. „Tim hatte auch für alles eine Erklärung" ist weniger bedrohlich als „Du rechtfertigst dich gerade". Die Geschichte schafft Abstand, und aus dem Abstand entsteht Einsicht. Danach führt der Coach zurück zum Nutzer.

**Entschieden am 19.11.2026:**

| # | Frage | Entscheidung |
|---|---|---|
| B-1 | Kaufnachweis? | **Nein.** Der Nutzer gibt selbst an, ob er das Buch gelesen hat. Wer schummelt, bekommt Bruchstücke ohne Zusammenhang und hat davon nichts. Technisch ginge ein Nachweis ohnehin nicht: KDP liefert keine Käuferdaten, die Taschenbücher werden identisch auf Bestellung gedruckt, und auf dem Kindle gibt es keine festen Seiten. |
| B-2 | Schutz der Buchinhalte | über **Regeln für den Coach** statt über eine Prüfung des Nutzers (Abschnitt 3) |
| B-3 | Eigene Seite in der App | **Ja:** „Das Buch zur App" stellt das Buch vor und erklärt die Verbindung (Abschnitt 1) |
| B-4 | Werbung im Chat | **Nein.** Wer das Buch nicht kennt, hört im Gespräch nichts davon. Das Buch wird nur auf der Buch-Seite, im Profil und in „Wie es funktioniert" vorgestellt. |
| B-5 | Lesercode | **Nein** (Entscheidung vom 19.11.2026) |
| B-6 | „Ich lese gerade" | **Lesestand wählbar** (Teil 1–7 oder „durch"). Bezüge nur bis zum gewählten Teil (Abschnitt 2) |

---

## 1. Die Buch-Seite

**Route:** `/buch`, innerhalb von `AppShell`
**Erreichbar über:**
- **Profil:** Karte „Das Buch zur App" (neben Jeromes Coaching-Karte)
- **„Wie es funktioniert":** eigener Block
- **Heute:** einmalige Frage nach dem ersten Gespräch (Abschnitt 2), Link „Was ist das? →"
- **Heute, Zustand A (neu):** dezenter Link unter „So funktioniert's"

**Aufbau:**

```
←  Das Buch zur App

┌──────────────────────────────────────┐
│          [ Cover-Motiv ]             │
│   Zwei Menschen von hinten auf einem │
│   Feldweg im Abendlicht              │
└──────────────────────────────────────┘

Friedensstifter
Zwei Nachbarn, ein Feldweg und sieben Gespräche

Tim hat schlechte Laune, und er weiß genau, warum: Sein
Chef ist schuld. Mara wohnt zwei Häuser weiter, geht jeden
Abend dieselbe Runde und stellt Fragen. Sieben Gespräche auf
dem Feldweg, vom Herbst bis in den April. Nach jedem steige
ich aus der Geschichte aus und erkläre, was dahintersteckt.
Und ich erzähle, wo mir die Themen selbst begegnet sind.

WAS DAS MIT DIESER APP ZU TUN HAT
Am Ende jedes Teils stehen im Buch ein paar Fragen an dich.
Hier in der App kannst du weiterfragen lassen: Dein Begleiter
stellt Fragen, so wie Mara. Wenn du das Buch kennst, erinnert
er dich ab und zu an eine Szene zwischen Tim und Mara, die
gerade passt, oder an etwas, das ich im Buch erzähle.
Manchmal sieht man ein Muster bei Tim schneller als bei sich
selbst. Und dann denkst du: Moment, das kenne ich.

  „Ein guter Coach weiß das am Anfang auch nicht.
   Aber er kann fragen."  – aus dem Epilog

Die App funktioniert auch ohne das Buch.
Mit dem Buch wird sie ein Stück reicher.

[ Als E-Book (Kindle) → ]   [ Als Taschenbuch → ]
                             (ab 27.11. – bis dahin „Erscheint am 27.11.")

KENNST DU DAS BUCH SCHON?
  ( ) Ja, durchgelesen
  ( ) Ich lese gerade  →  Bis wohin bist du?  [ Teil 1 … Teil 7 ]
  ( ) Noch nicht

(JH)  Jerome Houboi · Systemischer Coach
```

**Textprinzipien:** Der Text ist in Jeromes Stimme gehalten, direkt und mit einem Augenzwinkern, ohne Pathos. Er hält das Sprachprinzip ein: kein „müssen", kein „Du brauchst", kein absolutes „immer" oder „nie". Inhaltliche Aussagen über das Buch gehen nicht über das hinaus, was Jerome freigibt. Den Textentwurf oben passt Jerome an.

**Textgrundlage:** Die Inhaltsangabe stützt sich auf das Manuskript (Prolog, „Worum geht's?", Teil 1–7). Das Zitat aus dem Epilog ist wörtlich geprüft. Jerome passt den Text an und gibt ihn frei (B-7). **Freigegeben am 21.11.2026 ohne Änderungen.**

**Links zu Amazon:** einfache externe Links (`target="_blank"`, `rel="noopener noreferrer"`), kein Affiliate-Tracking, kein Pixel. Die erzwingende CSP (S-08) blockiert keine ausgehenden Links. Trotzdem nach dem Deploy kurz testen.

---

## 2. Buch-Status: fragen und speichern

**Datenmodell (additiv):**

```sql
alter table profiles
  add column if not exists book_status text
    check (book_status in ('read', 'reading', 'not_yet')),
  add column if not exists book_progress int
    check (book_progress between 1 and 8),   -- nur bei 'reading': gelesen bis Teil N
  add column if not exists book_status_at timestamptz;
```

Der Schutz-Trigger `trg_protect_profile_privileges` (S-01, Migration 024) erlaubt dem Nutzer bisher nur bestimmte Spalten. `book_status` und `book_status_at` sind ausdrücklich freizugeben. Besser noch: die Änderung über eine RPC `set_book_status(p_status, p_progress)` abwickeln, nach dem Muster von `set_learning_opt_in`.

**Wo gefragt wird:**
1. **Einmalig auf Heute nach dem ersten abgeschlossenen Gespräch** (nicht im Onboarding, damit das Onboarding schlank bleibt):

   ```
   ┌──────────────────────────────────────┐
   │ Kleine Frage am Rande:               │
   │ Kennst du das Buch zur App?          │
   │                                      │
   │ Ja · Ich lese gerade · Noch nicht    │
   │                   Was ist das? →     │
   └──────────────────────────────────────┘
   ```
   Wird die Karte übergangen, erscheint sie nicht wieder. Der Status bleibt dann `null` und wird wie `not_yet` behandelt.
2. **Auf der Buch-Seite** (Abschnitt 1)
3. **Im Profil:** jederzeit änderbar

**Wirkung je Status:**

| Status | Buch-Bezüge im Gespräch | Spiegel „Im Buch" |
|---|---|---|
| `read` | ja, alle Einträge (Position 0–8) | ja |
| `reading` + Lesestand N | ja, nur Einträge mit Position ≤ N | nur bis Teil N |
| `not_yet` / `null` | **nein**, das Buch wird im Chat nicht erwähnt | nein |

**Warum der Lesestand (B-6):** Das Buch hat Erzählstränge, die sich erst später auflösen. Das betrifft zum Beispiel, was Kerstin im Herbst wirklich gehört hat, wie es mit Jule und den Bewerbungen ausgeht und was hinter Maras Satz über ihre Schwester steckt. Wer gerade in Teil 3 liest und vom Coach einen Bezug auf Teil 7 bekommt, erfährt vorab, wie die Geschichte ausgeht. Deshalb wählt der Nutzer bei „Ich lese gerade", bis zu welchem Teil er gekommen ist. Der Coach greift dann nur Stellen bis dorthin auf. Davor und danach (Jeromes Geschichte zwischen Teil 6 und 7) zählt als Position 6, der Epilog als 8.

**Lesestand aktuell halten:** Der Coach fragt nicht nach dem Lesestand. Auf der Buch-Seite und im Profil lässt er sich jederzeit ändern. Höchstens einmal im Monat erscheint auf Heute eine kleine Karte: „Wie weit bist du mit dem Buch? Teil … / durch". Ohne Antwort bleibt der alte Stand.

## 3. Regeln für den Coach

Diese Regeln stehen als fester Block im System-Prompt, aber nur, wenn `book_status` = `read` oder `reading` ist **und** für das aktuelle Gespräch passende Buchstellen gefunden wurden (Abschnitt 5).

**Haltung:**
1. **Erst fragen, dann erzählen.** Bevor der Coach eine Szene nennt, lädt er ein: „Erinnert dich das an ein Gespräch zwischen Tim und Mara?" Den Zusammenhang soll am besten der Nutzer selbst herstellen. Erst wenn er nichts damit verbindet, bietet der Coach die Szene in ein bis zwei Sätzen an.
2. **Höchstens ein Buchbezug pro Gespräch**, und nur wenn er wirklich passt. Lieber keiner als ein bemühter.
3. **Zurück zum Nutzer.** Der Bezug ist eine Brücke, kein Ziel. Die nächste Frage gilt wieder dem Nutzer: „Was ist bei dir ähnlich, was ist anders als bei Tim?"
4. **Nicht im emotionalen Ausnahmezustand.** Bei Wellness-Score ≤ 3, bei Hinweisen auf akute Belastung oder bei `open_thread_intensity = 'high'` gibt es keine Buchbezüge. Das gleiche Sicherheitsnetz gilt für die Inneren Stimmen.
5. **Jerome nur aus dem Buch zitieren.** Erzählt der Coach von Jerome, dann nur, was in der mitgegebenen Buchstelle steht. Die Form ist „Jerome erzählt im Buch, wie …", nie als eigene Erinnerung des Coaches.

**Schutz der Buchinhalte und der Wahrheit:**
6. **Nur mitgegebene Stellen.** Der Coach verweist ausschließlich auf Buchstellen, die ihm im Block „BUCH-STELLEN" mitgegeben werden. Er erfindet keine Szenen, Dialoge, Zitate oder Anekdoten und ergänzt sie nicht aus der Erinnerung. Ist nichts mitgegeben, erwähnt er das Buch nicht.
7. **Kurze Zitate:** höchstens ein bis zwei Sätze wörtlich, sonst in eigenen Worten
8. **Kein Ende verraten:** Der Coach erzählt nicht, wie ein Gespräch, Tims Entwicklung oder das Buch ausgeht, und fasst keine Kapitel zusammen.
9. **Keine Buch-Zusammenfassung auf Wunsch.** Fragt der Nutzer „Erzähl mir das Buch" oder „Wie geht das aus?", antwortet der Coach freundlich: „Das liest du am besten selbst. Hier geht es um dich."

**Prompt-Block (Entwurf):**

```
--- BUCH-STELLEN (nur diese verwenden) ---
Der Mensch kennt Jeromes Buch "Friedensstifter" (Status: {read | reading bis Teil N}).
Passend zu diesem Gespräch könnten diese Stellen sein:

[1] Teil {position} – {part_title} · {title}
    Art: {Gespräch Tim & Mara | Erklärung | Jeromes eigene Geschichte}
    Situation: {situation_summary}
    Kernsatz (wörtlich, darf zitiert werden): "{key_quote}"
    Einladungsfrage: {bridge_question}
    {falls erklaerung: Fragen aus dem Buch: …}
    {falls is_resolution: NICHT nacherzählen, wie es ausgeht.}
    {falls is_sensitive: SONDERREGEL: {sensitive_rule}}

REGELN: siehe Haltung 1–5 und Schutz 6–9.
Nutze höchstens EINE Stelle, nur wenn sie wirklich passt,
und erst nachdem du gefragt hast, ob es den Menschen an etwas erinnert.
Wenn keine Stelle passt: erwähne das Buch nicht.
--- ENDE BUCH-STELLEN ---
```

---

## 4. Die Buch-Landkarte

**Entwurf liegt vor:** `claude/friedensstifter-buch-landkarte-v1.md`, 58 Einträge aus dem Manuskript (28 Dialog, 13 Erklärung, 17 Jerome). Alle Kernsätze sind maschinell wörtlich gegen das Manuskript geprüft. 8 Einträge sind als sensibel (⚠) markiert, 8 als Auflösung (🔒). **Jerome prüft jeden Eintrag** (✓ / ✎ / ✕). Erst danach entsteht der Seed.

Eine kuratierte Tabelle statt des ganzen Buchs im Prompt: Das ist günstiger, genauer, und es gibt nur Bruchstücke preis.

```sql
create table if not exists book_passages (
  id                text primary key,              -- z. B. 'T3-D1' (stabil, aus der Landkarte)
  kind              text not null check (kind in ('dialog', 'erklaerung', 'jerome')),
  position          int  not null check (position between 0 and 8), -- 0 Vorweg … 7 Teil 7, 8 Epilog
  part_title        text,                           -- z. B. 'Die Kampagne'
  season_label      text,                           -- z. B. 'erster Frost'
  title             text not null,                  -- kurzer Titel der Szene
  situation_summary text not null,                  -- 1–3 Sätze, ohne das Ende zu verraten
  key_quote         text not null,                  -- max. 2 Sätze, wörtlich geprüft
  bridge_question   text,                           -- Einladungsfrage für den Coach
  fits_when         text,                           -- wann die Stelle passt (für die Auswahl)
  book_questions    text[] default '{}',            -- „Fragen an dich" (nur bei kind='erklaerung')
  pattern_keys      text[] default '{}',            -- Muster der App, z. B. {uebernahme_reflex}
  mechanisms        text[] default '{}',            -- z. B. {fernbedienung, gedankenlesen}
  themes            text[] default '{}',            -- z. B. {arbeit, partnerschaft}
  is_resolution     boolean not null default false, -- 🔒 löst einen früheren Strang auf
  is_sensitive      boolean not null default false, -- ⚠ Sonderregeln
  sensitive_rule    text,                           -- konkrete Sonderregel aus der Landkarte
  is_active         boolean not null default true,
  approved_by_jerome_at timestamptz                 -- nur freigegebene Einträge werden genutzt
);

alter table book_passages enable row level security;
-- Keine Policies für authenticated/anon: Lesen nur serverseitig (service_role).
grant select on book_passages to service_role;
```

**Ablauf bis zum Seed:**
1. ✅ Manuskript gelesen, Entwurf der Landkarte erstellt (19.11.2026)
2. ⬜ Jerome prüft Eintrag für Eintrag
3. ⬜ Claude erzeugt aus der freigegebenen Landkarte den SQL-Seed. Nur Einträge mit ✓ oder angepasstem ✎ bekommen `approved_by_jerome_at`.

## 5. Ablauf im Gespräch

Die Buchstellen werden in `chat` serverseitig ausgewählt, genauso wie Akte, Briefing und RAG seit S-12:

1. **Vorbedingungen:** `book_status` in (`read`, `reading`). Im aktuellen Gespräch gab es noch keinen Buchbezug. Die Sicherheitsregel 4 greift nicht. Das Gespräch hat mindestens 4 Nachrichten, denn am Anfang zählt das Ankommen.
2. **Auswahl ohne neuen Datenfluss:** Die Stellen werden über die schon vorhandenen Muster gefunden, also die `pattern_keys` aus `coach_file_entries` und `pattern_references` dieses Gesprächs bzw. Nutzers, dazu die `themes`. So werden **keine** zusätzlichen Nutzerinhalte an einen Embedding-Dienst geschickt (vgl. S-18). Eine Ähnlichkeitssuche über Embeddings ist erst später eine Option, und nur wenn ohnehin vorhandene Query-Embeddings wiederverwendet werden können.
3. **Höchstens 2 Kandidaten** gehen in den Block. Bei `reading` nur Stellen mit `position <= book_progress`. ⚠-Einträge nur, wenn ihr Thema im aktuellen Gespräch vom Nutzer selbst angesprochen wurde und keine Sicherheitsregel greift. Die `sensitive_rule` wird im Block mitgegeben.
4. **Merken, dass der Bezug genutzt wurde:** `post-conversation` (Haiku) erkennt, ob der Coach eine Buchstelle aufgegriffen hat, und setzt `conversations.book_reference_used = true`. Alternativ prüft `chat` direkt, ob die Antwort auf eine mitgegebene Stelle verweist. Das entscheidet das Handoff.
5. **Kosten:** etwa 200–400 zusätzliche Tokens pro Aufruf, nur solange der Block aktiv ist

**Spiegel:** Im Muster-Detail (UX-Konzept 4.3b) erscheint für Leser ein kleiner Hinweis, etwa „Im Buch: Teil 3 – Die Kampagne" mit dem Szenentitel. Es gibt kein Zitat und keine Zusammenfassung, nur die Fundstelle.

---

## 6. Lesercode – verworfen

Am 19.11.2026 entschieden: **kein Lesercode.** Der Status beruht auf der Selbstauskunft des Nutzers (B-1). Die Brücke vom Buch zur App entsteht über den Hinweis im Buch auf friedensstifter.coach und über die Buch-Seite in der App.

## 7. Datenschutz

- `book_status` ist eine harmlose Angabe ohne Gesundheitsbezug. Sie wird beim Löschen des Kontos mit `profiles` gelöscht.
- `book_passages` enthält keine Nutzerdaten.
- Durch die Auswahl über Muster (Abschnitt 5.2) entsteht **kein neuer Datenfluss** zu Drittanbietern.
- Buchinhalte im Prompt gehen wie alle Prompt-Inhalte an Anthropic. Das ist Jeromes eigenes Werk, er hält die Rechte (Selbstverlag).
- Die Amazon-Links sind einfache externe Links ohne Tracking.

---

## 8. Offene Entscheidungen

- ✅ **B-7 Textentwurf der Buch-Seite:** von Jerome am 21.11.2026 **unverändert freigegeben** (Abschnitt 1, Aufbau der Seite). Der Link zum Taschenbuch folgt ab 27.11.
- **B-8 Prüfung der Landkarte:** alle 58 Einträge, besonders die 8 mit ⚠
- **B-9 Sprachprinzip bei Buchzitaten:** Einige Kernsätze des Buchs enthalten „muss" (z. B. T4-J1, ein zitierter alter Glaubenssatz). Vorschlag: Wörtliche Buchzitate sind als Zitat erkennbar und damit vom Sprachprinzip ausgenommen, der Coach formuliert drumherum ohne „müssen". Bei der Auswahl wurden solche Sätze trotzdem weitgehend vermieden.

## 9. Nächste Schritte

1. ✅ Manuskript übergeben, Titel und E-Book-Link eingetragen, B-5 und B-6 entschieden
2. ✅ Entwurf der Buch-Landkarte erstellt (`claude/friedensstifter-buch-landkarte-v1.md`)
3. ⬜ **Jerome:** Landkarte prüfen (B-8), ~~Seitentext freigeben (B-7)~~ ✅ 21.11.2026, Taschenbuch-Link ab 27.11. nachreichen
4. **Schnell umsetzbar, unabhängig vom Rest:** Buch-Seite `/buch` plus Profil-Karte, reines Frontend plus `book_status`-RPC. Passt zum Erscheinen am 27.11.
5. **Danach (nach Modellwechsel und Paket C):** Handoff „Buch-Bezüge" mit `book_passages`, Seed, Auswahl in `chat`, Prompt-Block und Spiegel-Hinweis

---

*Konzept „Buch zur App" v1.1 · erstellt mit Claude für Jerome Houboi · friedensstifter.coach*
