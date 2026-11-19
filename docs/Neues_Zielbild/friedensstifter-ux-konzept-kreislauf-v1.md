# Friedensstifter – UX-Konzept „Kreislauf" v1.2

**Status:** Konzept, Entscheidungen von Jerome eingearbeitet, noch kein Handoff für Claude Code
**Stand:** 19.11.2026
**Basis:** `friedensstifter-design-document-v3_1.md` (Funktionsumfang), Entscheidung vom 19.11.2026 für Vorschlag 3 („Kreislauf") mit dem Gesprächseinstieg aus Vorschlag 1
**Grundsatz:** Funktionen bleiben, Darstellung, Erreichbarkeit und Wirkung ändern sich. Wo eine kleine technische Ergänzung nötig ist, ist sie in Abschnitt 8 ausdrücklich markiert.

### Changelog v1.2 (gegenüber v1.1)

1. **Geschäftsmodell:** „Kennenlernen → Ruhemodus → Begleitung" ersetzt „1 Gespräch pro Woche". 3 kostenlose Gespräche ohne Zeitlimit, danach bleibt alles Erkannte dauerhaft sichtbar, neue Gespräche nur in der Begleitung (5.3, 5.4, 8.3)
2. **Kostenrahmen** ergänzt, auf Basis von Sonnet 5.5 einschließlich +30 % Tokenizer-Effekt (5.2a)
3. **Werbung ausgeschlossen.** Nur eigene Empfehlung ohne Tracking (Coaching, Buch) (5.2a)
4. **Kappung** von 100 Nachrichten pro Gespräch ohne Abo (8.3)
5. Offene Frage 9.2.1 erledigt: Im Kennenlernen gibt es das volle Erlebnis inkl. Resonanzkarte

### Changelog v1.1 (gegenüber v1.0)

1. **Leitsatz** ergänzt (Abschnitt 0)
2. **Erkenntnis auf Heute verdeckt**, mit sichtbarer Erklärzeile zum Schutz der Privatsphäre (4.1)
3. **Free-Modell:** 1 Gespräch pro Woche statt 4 pro Monat *(in v1.2 ersetzt durch Kennenlernen + Ruhemodus)*
4. **Reflexionssträhne** wird zu „Reflexionstage" im Profil (4.4)
5. **Keine Kreislauf-Leiste auf Heute.** Der Kreislauf wird nur in „Wie es funktioniert" erklärt (4.1)
6. **Wertfreie Darstellung:** keine Wertungsfarben, keine Konfidenz-Punkte, kein „Aufgelöst" (4.3)
7. **NEU – Deine Einschätzung:** Der Nutzer bewertet selbst, die App bewertet nichts. Seine Rückmeldungen helfen dem Coach zu lernen, was ihm hilft (4.3d, 8.6)
8. **NEU – Weiterarbeiten-Einstieg:** Der Coach knüpft wie ein echter Coach an eine frühere Erkenntnis an (4.2d, 8.5)
9. **NEU – Wiederentdecken:** Ältere, kleinere Erkenntnisse tauchen gelegentlich wieder auf (4.1 Zustand C)

---

## 0. Leitsatz

> **Die App ist ein Begleiter, der dich mit der Zeit kennenlernt, und kein Programm, das du abarbeitest. Sie hält fest, was du erkannt hast, damit es nicht verloren geht. Sie lädt ein, daran weiterzuarbeiten, und sie bewertet nichts. Bewerten tust nur du. Das Ziel ist, dass du wieder mehr Einfluss auf dein Leben spürst.**

Daraus folgen drei Prüffragen für jede Design-Entscheidung:
1. **Lädt sie ein, oder drängt sie?** Nur einladen ist erlaubt.
2. **Wer bewertet?** Nur der Nutzer.
3. **Hilft sie, sich zu erinnern und daran weiterzuarbeiten?** Darin liegt der eigentliche Mehrwert gegenüber einem einzelnen Gespräch. Die großen Aha-Momente bleiben von selbst. Die kleinen gehen verloren, wenn niemand sie festhält.

---

## 1. Warum umbauen – die Diagnose in vier Sätzen

1. **Der Coach ist ein Werkzeug unter vielen.** Auf Home steht er gleichrangig in einem 2×2-Grid neben Wellness-Check, Innere Stimmen und Verstehen, obwohl er der Kern der App ist.
2. **Muster leben an vier Orten:** Spiegel-Filter „Muster", Akte Bereich 1, Verstehen und als Kandidaten bei den Inneren Stimmen. Der Nutzer bekommt Bruchstücke statt eines Bildes von sich.
3. **Reflexion ist ein Ziel, kein Weg.** Spiegel und Akte sind Orte, die man aktiv aufsuchen muss. Der Gesprächsverlauf liegt im Profil. Nichts führt den Nutzer nach einem Gespräch zurück zu dem, was er erkannt hat.
4. **Der Prozess ist unsichtbar.** Coaching wirkt im Kreislauf aus Ankommen, Sprechen, Erkennen und im Alltag Ausprobieren. Die App zeigt Stationen, keinen Weg.

---

## 2. Leitidee: der Kreislauf

```
        ┌──────────────┐
        │  ANKOMMEN    │  Wie geht's dir? · Tagesimpuls
        └──────┬───────┘
               ▼
        ┌──────────────┐
        │  SPRECHEN    │  Gespräch (neu oder weitermachen)
        └──────┬───────┘
               ▼
        ┌──────────────┐
        │  ERKENNEN    │  Erkenntnis · Muster · Stimme
        └──────┬───────┘
               ▼
        ┌──────────────┐
        │ AUSPROBIEREN │  Alltag · „Wie war es seitdem?"
        └──────┬───────┘
               └──────────► zurück zu ANKOMMEN
```

Jede bestehende Funktion hat genau einen Platz in diesem Kreislauf:

| Station | Bestehende Funktion | Wo sie künftig lebt |
|---|---|---|
| Ankommen | Wie geht's dir? (Wellness-Check), Tagesimpuls | Heute, Gesprächseinstieg |
| Sprechen | KI-Coach, Gesprächsverlauf, Wiederkehr-Begrüßung | Tab „Gespräch" |
| Erkennen | Insights, Coach-Akte, pattern_references, Innere Stimmen, Verstehen-Bibliothek | Tab „Spiegel" |
| Ausprobieren | Insights der Kategorie `ziel`, Entry-Kontext `spiegel` | Heute (Rückfrage), Spiegel → Gespräch |

**Haltung:** Der Kreislauf ist ein Angebot, kein Programm. Die App schlägt den nächsten Schritt vor und lässt immer einen Ausweg offen. Das gilt genauso wie bei den offenen Fäden (Designentscheidung 13).

---

## 3. Informationsarchitektur

### 3.1 Navigation: drei Tabs statt vier

```
┌────────────────────────────────────────┐
│                                   (JH) │  ← Avatar oben rechts → Profil
│                                        │
│              [ Screen ]                │
│                                        │
├────────────┬─────────────┬─────────────┤
│   Heute    │  Gespräch   │   Spiegel   │
│   (Sonne)  │  (Sprechbl.)│  (Funkeln)  │
└────────────┴─────────────┴─────────────┘
```

- **Heute**: Ankommen und Ausprobieren, der Einstieg in den Kreislauf
- **Gespräch**: Sprechen
- **Spiegel**: Erkennen
- **Profil** wandert aus der Tab-Leiste in den Avatar oben rechts. Das Profil ist Verwaltung, kein Teil des Kreislaufs.

### 3.2 Routen: alt → neu

| Bisher | Künftig | Hinweis |
|---|---|---|
| `/` Home | `/` Heute | neuer Screen-Inhalt, gleiche Route |
| `/coach` | `/coach` | vorgeschalteter Einstieg (4.2) |
| `/mirror` Tab 1 + Tab 2 | `/mirror` mit drei Ebenen | Erkenntnisse · Muster · Entwicklung |
| `/verstehen` | `/mirror/muster` | Redirect; Bibliothek wird Teil der Ebene „Muster" |
| `/verstehen/:key` | `/mirror/muster/:key` | Redirect; Detail vereint Verstehen-Detail und Akte-Verlauf |
| `/verstehen/aus-gespraechen` | entfällt als eigener Screen | Inhalt fließt in das Muster-Detail |
| `/stimmen` | `/mirror/muster` (Abschnitt „Deine Stimmen") | Redirect |
| `/wellness` | `/wellness` | unverändert, erreichbar über Heute und Gesprächseinstieg |
| Profil → Gesprächsverlauf | `/coach/verlauf` | aus dem Profil herausgelöst |
| `/profile` | `/profile` | über Avatar statt Tab |

Alle alten Routen bekommen Redirects, damit Lesezeichen und Deep Links der Beta-Tester weiter funktionieren.

---

## 4. Screens

### 4.1 Heute

**Prinzip:** Ein Screen, ein nächster Schritt. Eine Hauptkarte, höchstens zwei Nebenkarten. Kein Werkzeugkasten-Grid.

**Datenschutz-Prinzip bleibt bestehen:** Heute ist öffentlicher Raum (Designentscheidung 12). Gesprächsthemen stehen hier nicht. Für die eigene Erkenntnis siehe Zustand B.

Heute kennt vier Zustände, abgeleitet aus vorhandenen Daten:

**Zustand A – Neu** (noch kein Gespräch mit ≥ 3 Nachrichten)

```
Guten Abend
Was bewegt *heute?*

┌──────────────────────────────────────┐
│ So funktioniert's                    │  ← bisherige „Wie es funktioniert"-
│ Du bringst ein Thema mit. Der        │     Karte, Zustand A
│ Begleiter stellt Fragen. Was du      │
│ erkennst, sammelt sich im Spiegel.   │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ [ Erstes Gespräch beginnen ]         │  ← Hauptkarte
└──────────────────────────────────────┘
  Erst mal ankommen → Wie geht's dir?    ← Nebenlink
```

**Zustand B – Nachklang** (es gibt eine Erkenntnis aus den letzten 7 Tagen, die auf Heute noch nicht aufgegriffen wurde)

```
Guten Morgen
Was bewegt *heute?*

┌──────────────────────────────────────┐
│ 🔒 Aus deinem letzten Gespräch        │
│                                      │
│ [ Antippen zum Anzeigen ]            │  ← ENTSCHIEDEN: verdeckt
│                                      │
│ „Ich darf erst fragen, bevor ich     │  ← nach Antippen
│  übernehme."                         │
│                                      │
│ Deine Einschätzung ›                 │  ← 4.3d, nur bei source='auto'
│                                      │     zusätzlich „Stimmt das so?"
│ Wie war es seitdem?                  │
│            [ Daran weiterarbeiten → ]│  → setzt das Ursprungsgespräch fort
└──────────────────────────────────────┘     (4.2d), kein neues Gespräch
  Verdeckt, damit niemand mitliest, der gerade auf dein Handy schaut.
                                              ← Erklärzeile, 12px, ink-3,
                                                 dauerhaft sichtbar
  Tagesimpuls: Wo hast du heute Ja gesagt?   ← Nebenkarte
```

Das ist der wichtigste neue Moment der App. Zwei Gedanken dahinter:

1. **Der Nutzer bleibt Autor seiner Erkenntnis.** Seit v2.9 entstehen die meisten Insights automatisch (`source: 'auto'`), weil das Abschluss-Modal selten erreicht wird. Heute wird der natürliche Ort, an dem der Nutzer eine solche Erkenntnis bestätigt, in eigene Worte fasst oder einschätzt. Damit wird aus „Die App hat etwas über mich notiert" ein „Das habe ich erkannt".
2. **Transfer in den Alltag.** „Wie war es seitdem?" ist die klassische Anschlussfrage im Coaching. Sie öffnet das Gespräch, aus dem die Erkenntnis stammt, und der Coach knüpft dort an (4.2d). Weil das bestehende Gespräch fortgesetzt wird, verbraucht das keinen neuen Gesprächsstart. Im Ruhemodus ohne Restkapazität des Ursprungsgesprächs erscheint stattdessen die Einladung aus 5.4 Punkt 3.

**Privatsphäre-Hinweis:** Die Erklärzeile unter der Karte bleibt dauerhaft sichtbar. So versteht der Nutzer auch nach längerer Pause, warum er antippen soll. Die Verdeckung ist auf Heute Standard. Im Spiegel (geschützter Raum, bewusst aufgerufen) sind Erkenntnisse offen sichtbar.

Ausweg: „Heute nicht" schiebt die Karte weg, ohne Rückfrage.

**Zustand C – Ruhe** (keine offene Erkenntnis, kein Gespräch heute)

```
Guten Tag
Was bewegt *heute?*

┌──────────────────────────────────────┐
│ ✦ Tagesimpuls                         │  ← Hauptkarte
│ Was trägst du gerade mit dir, das    │
│ eigentlich nicht dir gehört?         │
│                    [ Darüber reden ] │
└──────────────────────────────────────┘
  Erst mal ankommen → Wie geht's dir?
  Ins Gespräch →
```

**Variante C2 – Wiederentdecken** (gelegentlich statt des Tagesimpulses, höchstens einmal pro Woche)

```
┌──────────────────────────────────────┐
│ 🔒 Vor drei Wochen hast du etwas      │
│    erkannt.                          │
│ [ Antippen zum Anzeigen ]            │
│                                      │
│ Daran weiterarbeiten →               │
└──────────────────────────────────────┘
  Verdeckt, damit niemand mitliest, der gerade auf dein Handy schaut.
```

Hier bekommt die App ein Gedächtnis für die kleinen Erkenntnisse, die sonst untergehen. Ausgewählt wird eine Erkenntnis, die älter als 14 Tage ist und auf Heute noch nie angezeigt wurde. Erkenntnisse, die der Nutzer als „Hat mich weitergebracht" markiert hat, haben Vorrang. Nicht ausgewählt werden Erkenntnisse mit „Teile ich nicht" oder mit Entfernen-Wunsch. Es gibt keine Rückfrage und keine Pflicht: Wer nicht antippt, sieht beim nächsten Mal wieder den Tagesimpuls.

**Zustand D – Heute schon gesprochen** (Gespräch heute abgeschlossen)

```
┌──────────────────────────────────────┐
│ Du warst heute schon im Gespräch.    │
│ Lass es ruhig nachwirken.            │
│                                      │
│ Was du erkannt hast → Spiegel        │
└──────────────────────────────────────┘
```

Zustand D ist bewusst ruhig. Die App lädt an diesem Tag nicht zu mehr ein. Das passt zur Haltung „Stille ist Teil des Coachings".

**Keine Kreislauf-Leiste (ENTSCHIEDEN):** Heute zeigt keine Anzeige der Stationen (Ankommen · Sprechen · Erkennen · Ausprobieren). Eine solche Leiste wäre eine Einordnung von außen („Du bist jetzt bei Erkennen") und widerspräche Prüffrage 2. Der Kreislauf ist erlebbar, weil Heute jeweils das zeigt, was gerade dran ist. Erklärt wird er einmal im Screen „Wie es funktioniert" (7.8), mit der Grafik aus Abschnitt 2.

**Was von Home wegfällt:**
- **Werkzeugkasten-Grid:** Der Coach ist jetzt ein Tab, der Wellness-Check ein Einstieg, Verstehen und Innere Stimmen leben im Spiegel.
- **Reflexionssträhne als Balken:** Eine Strähne erzeugt Druck („nicht abreißen lassen") und widerspricht der einladenden Haltung. ENTSCHIEDEN: Sie wird zu „Reflexionstage" im Profil (Tage gesamt, nicht Tage in Folge, ohne Flamme).

### 4.2 Gespräch

#### 4.2a Einstieg (neu, vor dem Chat)

Dieser Screen nimmt die bisherige Wiederkehr-Begrüßung auf und macht sie für den Nutzer wählbar. Er erscheint nur, wenn es mindestens ein früheres Gespräch gibt.

```
Dein Begleiter
Schön, dass du da bist.

WEITERMACHEN
┌──────────────────────────────────────┐
│ Spannung im Team                     │
│ vor 3 Tagen · da war noch etwas offen│  ← open_thread vorhanden
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ Grenzen setzen                       │
│ letzte Woche                         │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ Ein Gespräch, das dich bewegt hat    │  ← intensity='high': kein Thema
│ vor 2 Wochen                         │
└──────────────────────────────────────┘
  Alle Gespräche →                         → /coach/verlauf

┌──────────────────────────────────────┐
│ [ Etwas Neues mitbringen ]           │  ← Primär-Button
└──────────────────────────────────────┘
  Erst mal ankommen → Wie geht's dir?
```

**Regeln:**

| Situation | Verhalten |
|---|---|
| Erstes Gespräch überhaupt | Einstieg entfällt, Chat startet mit Eröffnung D |
| Nutzer tippt „Daran weiterarbeiten" (Heute oder Spiegel) | Einstieg entfällt, Ursprungsgespräch öffnet sich mit Weiterarbeiten-Einstieg (4.2d) |
| Nutzer kommt mit anderem Entry-Kontext (Muster, Tagesimpuls) | Einstieg entfällt, Chat startet mit dem Kontext |
| Nutzer kommt mit Wellness-Check | Einstieg entfällt (Variante 3 hat Vorrang) |
| Ein Gespräch läuft noch (letzte Nachricht < 2 h) | Einstieg entfällt, das laufende Gespräch öffnet sich |
| Sonst | Einstieg erscheint |

**Bezeichnung der Gespräche:** Bezeichnet werden sie mit einem kurzen, neutralen Titel (3–5 Wörter). Steht in `open_thread_intensity` der Wert `'high'`, erscheint statt des Themas „Ein Gespräch, das dich bewegt hat". Das entspricht der bestehenden Regel, bei hoher Intensität das Thema nicht direkt zu nennen. Technischer Hinweis siehe 8.2.

**Verhältnis zur Wiederkehr-Begrüßung:** Wählt der Nutzer „Weitermachen", setzt er das Gespräch fort (bestehende Resume-Funktion). Der Coach eröffnet dann mit einem kurzen Anknüpfen, das auf dem offenen Faden dieses Gesprächs aufbaut. Dabei gelten die Formulierungsregeln aus 9.2 unverändert, einschließlich Ausweg. Wählt er „Etwas Neues", startet der normale Pool (Variante 2) ohne Wiederkehr-Begrüßung. Die Regel „höchstens alle 5 Tage" (`last_return_greeting_at`) wird damit überflüssig, denn der Nutzer entscheidet jetzt selbst.

#### 4.2b Chat

Bleibt funktional unverändert. Kopfzeile:

```
←  Dein Begleiter                    (Verlauf-Icon entfällt, Verlauf ist im Einstieg)
   Bereit für dich
```

#### 4.2c Abschluss: Brücke in den Spiegel

Das bestehende Abschluss-Modal „Was nimmst du heute mit?" bleibt. Nach „Ja, stimmt so" oder „Anpassen" folgt ein zweiter, optionaler Schritt:

```
┌──────────────────────────────────────┐
│ Liegt jetzt in deinem Spiegel.       │
│                                      │
│ Magst du etwas ausprobieren?         │
│ [ Freitext, optional ]               │  → insight, category='ziel'
│                                      │
│ Fertig                 Überspringen  │
└──────────────────────────────────────┘
```

Das ist keine neue Funktion: Kategorie `ziel` existiert bereits in `insights`. Ein so erfasstes Vorhaben ist das, was Heute in Zustand B mit „Wie war es seitdem?" aufgreift.

Wird das Modal übergangen (App geschlossen), greift wie bisher die automatische Erkenntnis aus `post-conversation`. Dann übernimmt Heute die Bestätigung (Zustand B).

**Nach einem Weiterarbeiten-Gespräch** (4.2d) bietet das Abschluss-Modal einmalig und überspringbar die Einschätzung der ursprünglichen Erkenntnis an (4.3d):

```
Du hast heute an „Ich darf erst fragen, bevor ich übernehme"
weitergearbeitet. Wie siehst du diese Erkenntnis jetzt?

  ✦ Hat mich weitergebracht   ·   Verstehe ich nicht   ·   Teile ich nicht
                                                          Überspringen
```

Das ist die einzige Stelle, an der die App aktiv nach einer Einschätzung fragt.

#### 4.2d Weiterarbeiten-Einstieg (NEU v1.1)

Wenn der Nutzer an einer Erkenntnis weiterarbeitet, steigt der Coach so ein, wie ein Coach in einer Folgesitzung einsteigen würde: Er fasst kurz zusammen, worum es ging, nennt die Erkenntnis in den Worten des Nutzers und leitet daraus **eine** Frage ab.

**Struktur der ersten Coach-Nachricht:**
1. Zeitbezug und Thema in einem Halbsatz („Vor drei Wochen ging es um …")
2. Die Erkenntnis wörtlich, als Zitat des Nutzers („Am Ende stand für dich der Satz: …")
3. Genau eine Frage, die auf das Jetzt und auf Erfahrungen seitdem zielt
4. Ausweg („Oder bringst du heute etwas anderes mit?")

**Beispiele:**

> „Vor drei Wochen ging es um die Spannung in deinem Team. Am Ende stand für dich der Satz: ‚Ich darf erst fragen, bevor ich übernehme.' Wenn du heute darauf schaust: Wo ist dir das seitdem begegnet? Oder bringst du heute etwas anderes mit?"

> Bei einem Vorhaben (`category='ziel'`): „Letzte Woche hattest du dir vorgenommen: ‚Im nächsten Meeting einmal nachfragen, bevor ich etwas zusage.' Wie ist es dir damit ergangen?"

**Regeln:**
- Bei `open_thread_intensity = 'high'` im Ursprungsgespräch nennt der Coach das Thema nicht, nur die Erkenntnis („Vor drei Wochen ist für dich ein Satz entstanden: …").
- Hat der Nutzer die Erkenntnis als „Verstehe ich nicht" markiert, beginnt der Coach mit einem Angebot zur Klärung statt mit einer Erfahrungsfrage: „Du hattest geschrieben, dass dieser Satz für dich nicht ganz greifbar war. Magst du mir erzählen, was daran unklar ist?"
- Hat der Nutzer „Teile ich nicht" gewählt, wird die Erkenntnis nicht als Einstieg angeboten (siehe 4.3d).
- Keine Bewertung im Einstieg. Kein „Das war eine wichtige Erkenntnis", kein „Super, dass du daran weiterarbeitest".

**Selbstwirksamkeit sichtbar machen:** Was der Nutzer daraufhin erzählt („Ich hab's einmal ausprobiert und …"), wird im Post-Processing als Insight der Kategorie `erkenntnis` mit Bezug zur Ursprungserkenntnis gespeichert. In der Ebene Entwicklung (4.3c) erscheint es als „Was du seitdem erlebt hast". Das ist der Beleg für Selbstwirksamkeit, und er stammt vom Nutzer, nicht vom Coach.

### 4.3 Spiegel – drei Ebenen

**Trennprinzip zwischen den Ebenen:**
- **Erkenntnisse** sind deine Worte: Sätze, die du bestätigt oder geschrieben hast.
- **Muster** zeigen, was sich wiederholt: Beobachtungen aus den Gesprächen, eigene Stimmen, allgemeine Muster zum Wiedererkennen.
- **Entwicklung** zeigt, wie du dich bewegst: die Zeitachse, Stärken und dein Kontext.

```
Spiegel
┌─────────────┬─────────────┬─────────────┐
│ Erkenntnisse│   Muster    │ Entwicklung │   ← Segment-Umschalter
└─────────────┴─────────────┴─────────────┘
```

#### 4.3a Erkenntnisse

- Bisheriger Tab 1, Filter verschlankt: **Alle · Erkenntnisse · Stärken · Vorhaben**
- Der Filter „Muster" entfällt hier. Insights der Kategorie `muster` erscheinen unter „Alle", denn sie sind trotzdem Sätze des Nutzers.
- Automatische, noch unbestätigte Einträge (`source='auto'`) tragen einen dezenten Hinweis „Vorschlag – stimmt das?" mit Ja · Anpassen · Entfernen.
- Jede Karte: „Deine Einschätzung ›" (4.3d) und „Daran weiterarbeiten →" (setzt das Ursprungsgespräch fort, 4.2d)
- Zusätzlicher Filter **„Hat mich weitergebracht ✦"**: nur Erkenntnisse, die der Nutzer selbst so markiert hat

#### 4.3b Muster

Hier laufen vier bisher getrennte Orte zusammen.

```
DEINE STIMMEN                                ← inner_voices, status='named'
┌──────────────────────────────────────┐
│ „Der Antreiber"                       │
│ zeigt sich bei: Arbeit, Familie      │
│                  Mit ihm sprechen →  │
└──────────────────────────────────────┘

WAS SICH BEI DIR ZEIGT                       ← coach_file_entries (pattern)
┌──────────────────────────────────────┐       + pattern_references
│ Übernahme-Reflex                     │  ← keine Konfidenz-Punkte (v1.1)
│ 4 Momente aus Gesprächen             │
│ gehört zu: Der Antreiber             │  ← voice_id (existiert bereits)
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ Rückzug unter Druck                  │
│ seltener in den letzten Gesprächen   │  ← status='fading', beschreibend
└──────────────────────────────────────┘

Da ist etwas, das sich wiederholt.          ← Stimmen-Kandidat (dezent)
Magst du es dir ansehen?   Darüber reden →

KENNST DU DAS?                               ← Verstehen-Bibliothek
  Harmonie um jeden Preis              ›
  Perfektionismus-Blockade             ›
  Der innere Kritiker                  ›
```

**Muster-Detail** (`/mirror/muster/:key`) vereint, was heute auf drei Screens verteilt ist:

1. Kurz erklärt, warum das wirkt (Mechanismus aus Verstehen 7.9b, plus der Vorschlag aus dem Perspektiven-Konzept Teil 2: Prinzip vor dem eigenen Beispiel)
2. **Deine Momente:** Zitate aus `pattern_references` (bisher „Aus deinen Gesprächen")
3. **Verlauf:** `coach_file_entries.history` (bisher Verlaufs-Sheet der Akte)
4. Entstehungsgeschichte in 3 Schritten (unverändert)
5. „Darüber sprechen →" (unverändert)

Für allgemeine Muster ohne persönlichen Bezug entfallen die Abschnitte 2 und 3.

#### 4.3c Entwicklung

Bisheriger Tab 2 „Deine Akte", neu geordnet, die Zeitachse steht vorne (Designentscheidung 15: „Entwicklung, nicht Status"):

```
Was sich bei dir bewegt
Aus 12 Gesprächen

Alle · Hat mich weitergebracht ✦              ← Filter (nur Nutzer-Markierungen)

DEINE ENTWICKLUNG                            ← Zeitachse, nach oben gezogen,
                                                einheitliche Farbe
  ● 18.11.  Was du seitdem erlebt hast:
            „Im Meeting einmal nachgefragt – war leichter als gedacht."
  ● 14.11.  Neue Stärke: klar benennen, was du brauchst        ✦
  ● 02.11.  Rückzug unter Druck: seltener in den letzten Gesprächen
  ● 21.10.  Übernahme-Reflex zum ersten Mal bemerkt

DEINE STÄRKEN
  ✦ Lösungsorientiert   ✦ Sorgfältig

WIE DU REAGIERST                             ← trigger + value
  Kritik von oben → Rückzug
  Fairness ist dir wichtig

DEIN ALLTAG                                  ← coachee_profile
  Beruf: Selbstständig · Lebensphase: Umbruch
  Wird aus deinen Gesprächen abgeleitet, du wirst nicht danach gefragt.
```

**Umbenennung:** „Deine Akte" heißt künftig „Entwicklung". Akte klingt nach Behörde oder Klinik und widerspricht „erst erleben, dann benennen". Der Bereich Muster der alten Akte ist in 4.3b aufgegangen.

**Wertfreie Darstellung (v1.1), gilt für den gesamten Spiegel:**

| Bisher (v3.1) | Künftig | Warum |
|---|---|---|
| Zeitachse farbcodiert (Grün = „Neues/Positives", Amber = Veränderung) | eine einheitliche Farbe | Farbe wäre eine Wertung von außen |
| Konfidenz-Punkte ● ● ● ○ ○ | Anzahl der Momente („4 Momente aus Gesprächen") | Punkte lesen sich wie eine Note |
| Status-Badge „Aufgelöst" (grün) | „zeigt sich gerade kaum" | beschreibt statt zu urteilen |
| Status-Badge „Zeigt sich seltener" (amber) | „seltener in den letzten Gesprächen" | Zeitbezug statt Tendenz-Aussage |
| — | ✦ nur dort, wo der Nutzer selbst markiert hat | Bewertung liegt beim Nutzer |

Die Felder `confidence` und `status` bleiben in der Datenbank und steuern weiter Sortierung und Prompt. Sie werden nur nicht mehr als Wertung angezeigt.

#### 4.3d Deine Einschätzung (NEU v1.1)

**Prinzip:** Die App bewertet nichts. Der Nutzer kann bewerten, freiwillig und jederzeit änderbar. Menschen bewerten ohnehin auf ihre eigene Art. Eine Bewertung von außen geht meistens schief. Die eigene Einschätzung dagegen kann bestätigen, dass man sich in eine Richtung bewegt, die sich für einen selbst richtig anfühlt.

**Wo:** an jeder Erkenntnis (Spiegel, Heute nach dem Aufdecken) und an jedem Eintrag der Zeitachse. Aktiv angeboten wird sie nur im Abschluss nach einem Weiterarbeiten-Gespräch (4.2c).

```
Deine Einschätzung
  ✦ Hat mich weitergebracht
  ?  Verstehe ich nicht
  ≠  Teile ich nicht
  ✎  Anpassen          ✕ Entfernen
```

Eine Auswahl ist möglich, und sie lässt sich jederzeit ändern oder zurücknehmen.

**Was jede Rückmeldung bewirkt:**

| Rückmeldung | Für den Nutzer sichtbar | Was der Coach daraus lernt |
|---|---|---|
| ✦ Hat mich weitergebracht | Markierung ✦, Filter in Erkenntnisse und Entwicklung, Vorrang beim Wiederentdecken | Diese Art, eine Erkenntnis abzuleiten und zu formulieren, passt zu diesem Menschen |
| ? Verstehe ich nicht | Angebot: „Magst du es im Gespräch klären? →" (Weiterarbeiten mit Klärungs-Einstieg, 4.2d) | Formulierungen konkreter, alltagsnäher, weniger abstrakt halten |
| ≠ Teile ich nicht | Angebot: „Magst du es in deinen Worten formulieren?" oder ausblenden; wird nicht wiederentdeckt | Diese Deutung hat nicht gepasst (siehe Hinweis zu Widerstand) |
| ✎ Anpassen | eigener Wortlaut ersetzt den Vorschlag, `source='user'` | Wie dieser Mensch Dinge selbst ausdrückt (Sprache, Bilder) |
| ✕ Entfernen | verschwindet aus dem Spiegel | wie „Teile ich nicht", aber ohne Lernen über die Deutung |

**Wichtiger fachlicher Hinweis zu „Teile ich nicht":** Systemisch betrachtet kann Ablehnung zweierlei bedeuten. Entweder hat die Deutung tatsächlich nicht gepasst. Oder sie ist nah an etwas herangekommen, das gerade schützt (Widerstand, siehe Design-Dokument 1.6). Der Coach darf das nicht selbst entscheiden und darf auch nicht nachbohren. Deshalb gilt:
- Die Rückmeldung wird neutral als „Deutung X wurde nicht geteilt" gespeichert, ohne Schlussfolgerung.
- Der Coach bringt diese Deutung nicht von sich aus wieder auf.
- Kommt der Nutzer später selbst in diese Richtung, darf der Coach behutsam anknüpfen, so wie bisher bei offenen Fäden.
- Ein betroffener Akte-Eintrag wird nicht automatisch gelöscht. Seine Konfidenz sinkt um eine Stufe. Die Entscheidung über Löschen liegt beim Nutzer (Entfernen).

**Wie das Lernen technisch funktioniert:** siehe 8.6. Kurz gesagt: Die Rückmeldungen fließen in die bestehende Resonanzkarte (`resonance_map`) und in die Erzeugung künftiger Erkenntnisse ein. Es entsteht keine neue, unsichtbare Datensammlung. Und wie bei der Resonanzkarte gilt Designentscheidung 16: Der Nutzer merkt das Lernen daran, dass ihm die Erkenntnisse mit der Zeit näher sind, nicht an einer Anzeige.

### 4.4 Profil (über Avatar)

Unverändert bis auf zwei Punkte:
- Gesprächsverlauf entfällt hier (lebt jetzt unter `/coach/verlauf`).
- Die Statistik-Zeile zeigt Gespräche · Erkenntnisse · Reflexionstage (bisherige Strähne, ohne Flammen-Symbolik).

---

## 5. Premium neu gedacht

### 5.1 Was an der heutigen Grenze nicht passt

Laut Freemium-Abschnitt in v3.1 ist das Free-Angebot so begrenzt:

| Aktuell gesperrt für Free | Problem |
|---|---|
| Spiegel: max. 10 Erkenntnisse | Die eigenen Sätze des Nutzers werden zurückgehalten. Das fühlt sich an wie „deine Gedanken gegen Gebühr". |
| Akte: nur erste Karte je Bereich, Rest gedimmt | „Was dein Coach über dich weiß, zeigen wir dir gegen Geld" untergräbt Vertrauen, gerade bei einem Produkt, das Vertrauen verkauft. |
| Verstehen: persönliche Gesprächsreferenzen gesperrt | Genau der Mechanismus, der laut Designentscheidung 11 die Kraft ausmacht („eigene Worte wiedererkennen"), fehlt Free-Nutzern. Ihnen fehlt damit das Aha-Erlebnis, das zum Bezahlen motivieren würde. |
| Gesprächsverlauf & Session-Notes | Ohne Verlauf funktioniert „Weitermachen" (4.2a) nicht. |
| 3 Gespräche/Monat | Bei drei Gesprächen im Monat kommt kein Kreislauf in Gang. Zwischen zwei Gesprächen liegen rund 10 Tage, ein Nachklang trägt so nicht. |

Dazu kommt ein Risiko, das für dich wegen des Haftungsthemas wichtig ist: Die Akte enthält Daten, die über den Nutzer abgeleitet werden. Nach Art. 15 DSGVO hat jede Person das Recht auf unentgeltliche Auskunft über die zu ihr gespeicherten Daten. Eine Paywall vor genau dieser Ansicht ist rechtlich nicht zwingend unzulässig, weil die Auskunft auch auf Anfrage erfolgen kann. Sie wirkt aber, als würde man Auskunft verkaufen. Das ist keine Rechtsberatung. Vor dem Bezahlstart solltest du den Punkt mit einer Datenschutzfachperson prüfen.

### 5.2 Neues Prinzip

> **Was über dich entsteht, gehört dir und ist jederzeit sichtbar. Bezahlt wird für Tiefe und Begleitung, nicht für den Blick auf die eigenen Daten.**

Der Kostentreiber der App sind die KI-Aufrufe pro Gespräch. Gespräche zu begrenzen, setzt also genau dort an, wo die Kosten entstehen. Ansichten zu sperren spart dagegen nichts: Heute, Spiegel, Wiederentdecken und Einschätzungen sind reine Datenbankzugriffe und laufen über das Hosting, das ohnehin bezahlt wird.

### 5.2a Kostenrahmen (Schätzung, Stand 19.11.2026)

Grundlage: Claude Sonnet 5.5 (2 $ / 10 $ pro Million Input-/Output-Tokens). Sonnet 5.5 erzeugt aus demselben Text rund 30 % mehr Tokens als Sonnet 4.5. Netto ist ein Gespräch daher nur etwa 13 % günstiger als heute, nicht ein Drittel.

| Gespräch | geschätzte Kosten ohne Prompt-Caching |
|---|---|
| kurz (ca. 20 Nachrichten) | ca. 0,15–0,20 $ |
| lang (ca. 60 Nachrichten) | ca. 0,80–0,90 $ |
| sehr lang (100 Nachrichten, Kappungsgrenze) | ca. 1,50–1,70 $ |

Mit Prompt-Caching des System-Prompts lässt sich das grob halbieren (eigenes Optimierungspaket, später). **Die echten Werte liefert das Token-Logging aus dem Modellwechsel-Handoff. Erst danach wird der Abo-Preis festgelegt.**

**Werbung ist ausgeschlossen (entschieden 19.11.2026).** Erstens deckt Banner-Werbung bei realistischen Einblendungszahlen nur wenige Cent pro Nutzer und Monat. Zweitens widerspricht sie dem Versprechen „Keine Werbung" auf der Landing-Seite. Drittens bringen Werbenetzwerke Tracking neben Daten nach Art. 9 DSGVO mit. Erlaubt ist nur eigene Empfehlung ohne Tracking: Jeromes persönliches Coaching, später das Buch. Sie erscheint im Profil, beim Ende des Kennenlernens und höchstens einmal nach einigen Wochen Nutzung. Nie im Chat und nie direkt nach einem intensiven Gespräch.

### 5.3 Neue Aufteilung: Kennenlernen → Ruhemodus → Begleitung (ENTSCHIEDEN)

Ein dauerhaft kostenloser Coach ist wirtschaftlich nicht tragbar. Das wird dem Nutzer offen erklärt. Gleichzeitig gilt 5.2: Was über ihn entstanden ist, bleibt für ihn sichtbar, auch ohne Abo.

**Die drei Phasen:**

1. **Kennenlernen** (kostenlos, einmalig): 3 neue Gespräche, ohne Zeitlimit. Jedes der drei kann fortgesetzt werden, auch über „Daran weiterarbeiten", bis zu einer Kappung von 100 Nachrichten pro Gespräch. Im Kennenlernen erlebt der Nutzer die App vollständig, einschließlich Resonanzkarte und Innerer Stimmen. Wer die App ausprobiert, soll das echte Erlebnis bekommen und keine abgespeckte Version.
2. **Ruhemodus** (kostenlos, unbegrenzt): beginnt, wenn alle drei Gesprächsstarts verbraucht sind. Heute, der ganze Spiegel, Wiederentdecken, Einschätzungen, Gesprächsverlauf zum Nachlesen und das Profil bleiben nutzbar. Was nicht mehr geht: neue Gespräche starten. Die drei Kennenlern-Gespräche lassen sich bis zu ihrer Kappungsgrenze weiterführen.
3. **Begleitung** (Bezahlmodell, Preis offen): unbegrenzt neue Gespräche und Weiterarbeiten, Export, Vorrang bei Terminen mit Jerome.

**Warum kein Zeitlimit im Kennenlernen:** Eine Frist („3 Gespräche in 4 Wochen") erzeugt Druck nach dem Motto „Nutze es oder verliere es" und widerspricht Prüffrage 1. Die Kosten sind trotzdem gedeckelt, nämlich über die Zahl der Gespräche und die Kappung pro Gespräch.

**Kostendeckel pro Nutzer ohne Abo:** höchstens 3 Gespräche × Kappungsgrenze. Das sind im ungünstigsten Fall rund 4–5 $ einmalig, typisch unter 1 $.

| Bereich | Kennenlernen | Ruhemodus | Begleitung |
|---|---|---|---|
| Neue Gespräche starten | 3 insgesamt | – | unbegrenzt |
| Gespräch fortsetzen / Daran weiterarbeiten | die 3 eigenen, bis 100 Nachrichten je Gespräch | die 3 eigenen, bis 100 Nachrichten je Gespräch | unbegrenzt *(faire Obergrenze siehe 8.3)* |
| Gedächtnis, Resonanzkarte, Einschätzungen mit Lerneffekt | ja | – (kein Gespräch) | ja |
| Innere Stimmen (Gespräch mit der Stimme) | ja | Stimmen sichtbar | ja |
| Heute inkl. Nachklang und Wiederentdecken | ja | ja | ja |
| Spiegel: Erkenntnisse, Muster, Entwicklung | ja | ja | ja |
| Einschätzungen setzen und ändern | ja | ja | ja |
| Gesprächsverlauf nachlesen | ja | ja | ja |
| Export der eigenen Daten (Selbstauskunft S-16) | ja | ja | ja |
| Komfort-Export (z. B. schön formatierte Erkenntnisse) | – | – | ja |
| Perspektiven-Spiegel (geplant) | ein Durchgang | – | unbegrenzt |
| Persönliches Coaching mit Jerome | Termin über Website | Termin über Website | Vorrang |

Hinweis zum Export: Die Selbstauskunft nach Art. 15 DSGVO (S-16, Paket C) steht allen offen und ist nie Teil des Bezahlmodells. Premium kann höchstens einen komfortableren Export bieten.

**Offene Frage 9.2.1 erledigt:** Im Kennenlernen gibt es das volle Erlebnis einschließlich Resonanzkarte. Im Ruhemodus finden keine Gespräche statt, also auch kein Lernen. Bei der Rückkehr in die Begleitung ist alles Gelernte noch da.

### 5.4 Übergänge und Einladungen statt Sperren

Keine gedimmten Teaser-Karten. Premium taucht nur an natürlichen Übergängen auf:

1. **Vor dem dritten Gespräch** (Gesprächseinstieg, einmalig, dezent):
   „Das ist dein drittes Gespräch zum Kennenlernen. Danach bleibt alles, was du hier erkannt hast, für dich sichtbar. Für neue Gespräche gibt es die Begleitung."
   Keine Rückfrage, kein Button. Der Nutzer soll nur nicht überrascht werden.
2. **Ende des Kennenlernens** (nach dem dritten Gespräch, einmalig, als Karte auf Heute):
   „Drei Gespräche liegen hinter dir. Was du erkannt hast, bleibt in deinem Spiegel, so lange du möchtest. Gespräche mit deinem Begleiter kosten mich Rechenleistung, deshalb kann ich sie nicht dauerhaft kostenlos anbieten. Wenn du weitermachen möchtest: Begleitung →. Oder ein persönliches Gespräch mit Jerome →."
   Ehrlich, in Jeromes Stimme, ohne Verknappungsdruck.
3. **Im Ruhemodus bei „Ins Gespräch" oder „Daran weiterarbeiten"** (bei einem Gespräch ohne Restkapazität):
   „Für ein neues Gespräch gibt es die Begleitung. Deine Erkenntnisse bleiben dir so oder so." Daneben „Begleitung →" und „Zurück zum Spiegel".
4. **Kappungsgrenze eines Gesprächs erreicht** (Kennenlernen oder Ruhemodus):
   „Dieses Gespräch ist sehr lang geworden. Ein neues Gespräch gibt deinem Begleiter einen frischen Blick, und er erinnert sich trotzdem an alles."

**Wiederentdecken im Ruhemodus** bleibt bewusst aktiv. Wochen später eine eigene Erkenntnis wiederzusehen, ist die ehrlichste Form der Einladung zurück. Die App zeigt damit, was sie bewirkt hat, statt etwas zu versprechen.

Die stärkste Botschaft für die Begleitung bleibt aus v3.1: „Sieh, wie du dich verändert hast." Sie wird jetzt so eingelöst: Der Nutzer sieht seine Entwicklung jederzeit, die Begleitung gibt ihm den Raum, sie weiterzuführen.

### 5.5 Unverändert bzw. Übergang

- Plan `tester` verhält sich weiter wie Begleitung (Premium).
- `session_limit` pro Nutzer (Admin) überschreibt den Standard von 3 Kennenlern-Gesprächen.
- Die Bezahlintegration bleibt bewusst nach der Beta. Bis dahin endet „Begleitung →" auf einer Info-Seite mit Kontakt zu Jerome.
- **Bestandsnutzer mit Plan `free`:** Das Kennenlernen startet für sie beim Rollout neu mit 3 Gesprächen. Bisherige Gespräche zählen nicht, ihre Erkenntnisse bleiben erhalten.
- **Spend-Limit bei Anthropic** setzen (S-05), als Schutz gegen Kostenausreißer, unabhängig vom Modell.

---

## 6. Sprache und Benennungen

| Bisher | Künftig | Warum |
|---|---|---|
| Home | Heute | beschreibt, was der Screen tut |
| Coach (Tab), KI-Coach (Karte) | Gespräch | Tätigkeit statt Rolle; „Coach" bleibt in Info-Kontexten erlaubt |
| Mein Spiegel | Spiegel | kürzer, Tab-tauglich |
| Deine Akte | Entwicklung | wirkt nicht klinisch, setzt Designentscheidung 15 um |
| Verstehen (Modul) | Muster → „Kennst du das?" | Bibliothek wird Teil der persönlichen Muster |
| Dein Werkzeugkasten | entfällt | |
| Reflexionssträhne 🔥 | Reflexionstage (nur Profil) | kein Abreiß-Druck |
| Aufgelöst / Zeigt sich seltener | zeigt sich gerade kaum / seltener in den letzten Gesprächen | beschreiben statt bewerten |
| Darüber sprechen (an Erkenntnissen) | Daran weiterarbeiten | macht klar: es geht im selben Gespräch weiter |

Alle neuen UI-Texte in diesem Dokument sind gegen das Sprachprinzip 1.5 geprüft: kein „müssen", kein absolutes „immer" oder „nie", kein „können nicht".

---

## 7. Was gleich bleibt

- Alle Edge Functions (`chat`, `post-conversation`, `pre-session-briefing`, Admin-Functions), Prompts und die Lern-Pipeline
- Datenmodell aller bestehenden Tabellen
- Entry-Kontext-Mechanismus (wird stärker genutzt, aber nicht verändert)
- Wellness-Check, Innere-Stimmen-Chatflow, Abschluss-Modal (nur ergänzt)
- Onboarding, Coaching-Vereinbarung, Einwilligungen, Legal-Screens, Konto löschen
- Designsystem (Farben, Typografie, Komponenten)

---

## 8. Kleine technische Ergänzungen (additiv, keine Breaking Changes)

### 8.1 Nachklang auf Heute

Damit Heute weiß, welche Erkenntnis es zeigen soll und welche schon aufgegriffen wurde:

```sql
alter table insights
  add column if not exists surfaced_at   timestamptz,  -- auf Heute angezeigt
  add column if not exists confirmed_at  timestamptz,  -- vom Nutzer bestätigt
  add column if not exists dismissed_at  timestamptz,  -- „Heute nicht"
  -- NEU v1.1: Deine Einschätzung (4.3d)
  add column if not exists user_rating   text
    check (user_rating in ('helpful', 'unclear', 'disagree')),
  add column if not exists rated_at      timestamptz,
  -- NEU v1.1: Selbstwirksamkeits-Moment verweist auf Ursprungserkenntnis (4.2d)
  add column if not exists follows_insight_id uuid
    references insights(id) on delete set null;
```

Auswahlregel für Zustand B: neueste Erkenntnis der letzten 7 Tage mit `dismissed_at IS NULL` und `user_rating IS DISTINCT FROM 'disagree'`. Kategorie `ziel` hat Vorrang. Bei Bestätigung wird `source` von `'auto'` auf `'user'` gesetzt, das ist bestehende Logik.

Auswahlregel für Wiederentdecken (Zustand C2): älter als 14 Tage, `surfaced_at IS NULL`, `user_rating IS DISTINCT FROM 'disagree'`, Vorrang für `user_rating = 'helpful'`. Höchstens einmal pro Kalenderwoche.

### 8.2 Neutraler Kurztitel pro Gespräch

`conversations.title` wird bisher aus dem ersten Nutzer-Input erzeugt. Für den Einstieg (4.2a) ist das zu roh, weil ein wörtlicher Gesprächsanfang zu viel preisgeben kann. Vorschlag: `SESSION_NOTES_PROMPT` um ein Feld ergänzen.

```
"display_title": "3–5 Wörter, neutral, ohne Namen, ohne Diagnose,
                  z.B. 'Spannung im Team', 'Eine Entscheidung'"
```

Gespeichert wird es in `conversations.title` (überschreibt den Rohtitel) oder in einer neuen Spalte `display_title`. Das gehört zur Entscheidung im Handoff.

### 8.3 Kennenlernen, Ruhemodus und Kappung (serverseitig)

Seit S-01 zählt der Server die Sitzungen (`consume_session`, Migration 023), und `profiles` ist gegen Selbständerung geschützt (Schutz-Trigger, Migration 024). Daran knüpft die neue Logik an. Durchgesetzt wird sie ausschließlich in der Edge Function `chat`, nicht im Frontend (Engineering-Regel: serverseitige Durchsetzung ist Pflicht).

- **Gesprächsstarts:** `consume_session` zählt künftig die Gesprächsstarts insgesamt (nicht pro Monat) für Nutzer ohne Begleitung. Grenze: `coalesce(profiles.session_limit, 3)`. Der Monats-Reset-Job `reset-monthly-sessions` entfällt für diese Zählung. Ob die Spalte umbenannt oder eine neue Spalte `trial_sessions_used` angelegt wird, entscheidet das Handoff nach Blick auf Migration 023.
- **Fortsetzen** eines bestehenden Gesprächs zählt nicht als Start. Dafür ist im Code zu prüfen, ob das Fortsetzen über den Verlauf bisher einen neuen `conversations`-Eintrag anlegt. Falls ja, ist das vorher anzupassen.
- **Kappung:** Ohne Begleitung nimmt `chat` pro Gespräch höchstens 100 Nachrichten an (Nutzer + Coach). Danach antwortet die Function mit `409 conversation_cap`, und das Frontend zeigt den Hinweis aus 5.4 Punkt 4. In der Begleitung gilt vorerst keine Kappung. Vor dem Bezahlstart folgt eine faire Obergrenze, abhängig vom Preis.
- **Status für das Frontend:** Ein abgeleiteter Wert `access_phase` (`kennenlernen` | `ruhemodus` | `begleitung`), den `pre-session-briefing` oder ein schlanker Profil-Endpunkt mitliefert. Er steuert nur die Anzeige. Durchgesetzt wird weiterhin im Server.
- **Bestandsnutzer `free`:** Zähler beim Rollout auf 0 setzen (einmalige Migration).
- **Spiegel-Sperren entfernen:** `MirrorScreen` Tab-2-Gate, 10er-Limit Erkenntnisse, AusGesprächen-Lock.
- **Token-Logging** aus dem Modellwechsel-Handoff (`handoff-modellwechsel-sonnet-5-5.md`) liefert die echten Kosten pro Gespräch und damit die Grundlage für Kappung und Preis.

### 8.4 Routing

Redirects nach 3.2, neue Route `/coach/verlauf`, `BottomNav` auf drei Tabs, Avatar-Button in `AppShell`.

### 8.5 Neuer Entry-Kontext `weiterarbeiten`

Erweitert den bestehenden `EntryContext` um eine Quelle. Kein neuer Codepfad, nur ein weiterer Zweig in BLOCK 7 von `buildSystemPrompt()`:

```ts
interface EntryContext {
  source: 'pattern' | 'tagesimpuls' | 'verstehen' | 'spiegel' | 'direct'
        | 'weiterarbeiten';                       // NEU v1.1
  // ...bestehende Felder...
  insightId?: string;          // Ursprungserkenntnis
  insightText?: string;        // wörtlich, in den Worten des Nutzers
  insightCategory?: 'muster' | 'stärke' | 'erkenntnis' | 'ziel';
  userRating?: 'helpful' | 'unclear' | null;
  originTopic?: string;        // display_title des Ursprungsgesprächs (8.2)
  originDateLabel?: string;    // "vor drei Wochen"
  originIntensity?: 'low' | 'medium' | 'high' | null;
}
```

Prompt-Block (Kern):

```
--- ENTRY-KONTEXT: WEITERARBEITEN AN EINER ERKENNTNIS ---
Der Mensch möchte an einer früheren Erkenntnis weiterarbeiten.
Ursprung: {originDateLabel}, Thema: {originTopic}
Erkenntnis (seine Worte): "{insightText}"

DEINE ERSTE ANTWORT – PFLICHTSTRUKTUR (wie ein Coach in einer Folgesitzung):
1. Zeitbezug + Thema in einem Halbsatz.
   Bei originIntensity = 'high': Thema NICHT nennen, nur die Erkenntnis.
2. Die Erkenntnis wörtlich als seinen Satz nennen.
3. GENAU EINE Frage zum Jetzt: Wo ist ihm das seitdem begegnet,
   was hat er damit erlebt? Bei category 'ziel': Wie ist es ihm damit ergangen?
   Bei userRating = 'unclear': stattdessen anbieten, gemeinsam zu klären,
   was an dem Satz nicht greifbar ist.
4. Ausweg: "Oder bringst du heute etwas anderes mit?"

KEINE Bewertung: kein "wichtige Erkenntnis", kein "toll, dass du dranbleibst".
Maximal 3 Sätze plus Frage.
--- ENDE ---
```

`post-conversation`: Entstehen in einem Weiterarbeiten-Gespräch neue Insights, die vom Erleben seit der Ursprungserkenntnis berichten, wird `follows_insight_id` gesetzt. Daraus speist sich „Was du seitdem erlebt hast" in der Zeitachse.

### 8.6 Lernen aus „Deine Einschätzung"

Keine neue Tabelle. Die Rückmeldungen wirken an zwei bestehenden Stellen:

**(a) Erzeugung künftiger Erkenntnisse (für alle Pläne).** Der Insight-Prompt bekommt die letzten Einschätzungen des Nutzers als Beispiele mit:

```
SO HAT DIESER MENSCH FRÜHERE ERKENNTNISSE EINGESCHÄTZT:
Hat ihn weitergebracht:  "Ich darf erst fragen, bevor ich übernehme."
Verstand er nicht:       "Dein Bedürfnis nach Kontrolle schützt dich vor Ohnmacht."
Teilte er nicht:         "Du suchst Anerkennung über Leistung."
Selbst umformuliert:     "Ich sag zu schnell Ja." (statt: "Du neigst zur Übernahme.")

→ Formuliere neue Erkenntnisse so, wie es bei den hilfreichen und
  selbst formulierten der Fall war: Sprache, Konkretheit, Ich-Perspektive.
→ Vermeide Deutungen in der Art der nicht geteilten — ohne daraus zu
  schließen, dass diese Deutungen falsch waren.
```

**Achtung, Architektur:** Insights entstehen derzeit im `ANONYMOUS_SUMMARY_PROMPT` (6b.1b), der bewusst ohne Personenbezug arbeitet. Persönliche Einschätzungen dürfen dort nicht hinein, weil sonst Personenbezug in die anonyme Erfahrungsdatenbank sickern könnte. Die Insight-Erzeugung wird deshalb in einen eigenen, personenbezogenen Prompt verschoben (`INSIGHT_PROMPT`). Für `experience_patterns` bleibt der anonyme Prompt unverändert.

**(b) Resonanzkarte (Premium).** `RESONANCE_UPDATE_PROMPT` bekommt die seit dem letzten Lauf neuen Einschätzungen als zusätzlichen Input. So können `effective_styles`, `resonant_metaphors` und `closing_patterns` daraus abgeleitet werden (z. B. „Konkrete Ich-Sätze mit Handlungsbezug kommen an, abstrakte Funktionsdeutungen nicht"). „Teile ich nicht" wird dabei ausdrücklich nicht als `closing_pattern` gewertet, sondern neutral als „Deutung nicht geteilt" notiert (siehe Hinweis zu Widerstand in 4.3d).

**(c) Coach-Akte.** Bezieht sich eine mit „Teile ich nicht" markierte Erkenntnis auf einen `coach_file_entries`-Eintrag (über `pattern_key` bzw. Konversation), sinkt dessen `confidence` um 1, mit Eintrag in `history`: „Nutzer teilt eine daraus abgeleitete Erkenntnis nicht". Kein automatisches Löschen.

**Datenschutz:** Die Einschätzungen sind Teil der Personalisierung, die die bestehende Einwilligung nach Art. 9 DSGVO (Onboarding Checkbox 2) bereits abdeckt. Sie werden beim Löschen des Kontos mitgelöscht (sie hängen an `insights`, CASCADE).

---

## 9. Entscheidungen

### 9.1 Entschieden am 19.11.2026

| # | Frage | Entscheidung |
|---|---|---|
| 1 | Erkenntnis auf Heute verdeckt oder offen? | **Verdeckt**, Antippen zum Anzeigen, mit dauerhaft sichtbarer Erklärzeile zum Schutz der Privatsphäre |
| 2 | Geschäftsmodell | **Kennenlernen (3 Gespräche, ohne Zeitlimit) → Ruhemodus (alles Erkannte bleibt sichtbar) → Begleitung (Bezahlmodell, Preis später)**; keine Werbung (geändert in v1.2, ursprünglich „1 Gespräch pro Woche") |
| 3 | Reflexionssträhne | **Reflexionstage im Profil** (Tage gesamt, ohne Flamme) |
| 4 | Kreislauf-Leiste auf Heute | **Keine Leiste.** Der Kreislauf wird in „Wie es funktioniert" erklärt |
| 5 | Bewertung | **Die App bewertet nichts, der Nutzer kann bewerten** (4.3d); seine Rückmeldungen helfen dem Coach zu lernen (8.6) |
| 6 | Weiterarbeiten | **Einstieg wie ein Coach in der Folgesitzung** (Zusammenfassung, Erkenntnis wörtlich, eine Frage), im Ursprungsgespräch (4.2d) |

### 9.2 Noch offen (für das Handoff)

1. **Kappungsgrenze:** 100 Nachrichten pro Gespräch ohne Begleitung als Startwert. Nach den ersten echten Token-Daten nachjustieren.
2. **`display_title`** als eigene Spalte oder als Überschreiben von `conversations.title` (8.2)

Das Konzept beantwortet nebenbei die offene Frage 3 aus `konzept-systemisches-denken-perspektiven-spiegel-v1.md`. Proaktiv angeboten wird der Perspektiven-Spiegel nur auf Heute in Zustand C, und nur wenn ein Muster aktiv ist. Sonst ist er ausschließlich über Spiegel → Muster erreichbar.

---

## 10. Nächste Schritte

0. **Vorgezogen, Frist 30.11.2026:** Modellwechsel auf Sonnet 5.5 (`handoff-modellwechsel-sonnet-5-5.md`), unabhängig von diesem Konzept und vor Paket C
1. Jerome beantwortet die zwei offenen Punkte in 9.2.
2. Klickbare Wireframes der Hauptscreens (Heute A–D inkl. Wiederentdecken, Gesprächseinstieg, Spiegel mit drei Ebenen, Muster-Detail, Einschätzung)
3. Handoff-Dokumente für Claude Code mit BEFORE/AFTER, Migration und Validierungs-Checkliste, aufgeteilt in vier Pakete:
   - **Paket 1 – Navigation & Routing** (3 Tabs, Avatar, Redirects, `/coach/verlauf`)
   - **Paket 2 – Heute & Gesprächseinstieg** (Zustände A–D, Wiederentdecken, Einstieg, 8.1, 8.2)
   - **Paket 3 – Spiegel-Zusammenführung, wertfreie Darstellung, Kennenlernen/Ruhemodus** (drei Ebenen, Muster-Detail, 8.3)
   - **Paket 4 – Weiterarbeiten & Einschätzung** (4.2d, 4.3d, 8.5, 8.6 inkl. Verschiebung der Insight-Erzeugung aus dem anonymen Prompt)
4. Nach Umsetzung: Designdokument auf v3.3 heben (Abschnitte 6b.1b, 7.2, 7.3, 7.5, 7.7, 7.9 und Freemium)

---

*UX-Konzept „Kreislauf" v1.2 · erstellt mit Claude für Jerome Houboi · friedensstifter.coach*
