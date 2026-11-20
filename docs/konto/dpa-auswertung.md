# Auswertung der Auftragsverarbeitungsverträge (DPAs)

**Stand:** 20.11.2026 · **Für:** Jerome und den Anwaltstermin (R-1/R-3)
**Quellen:** `docs/DPA/` (one.com, Anthropic, OpenAI, Supabase, Vercel)
**Hinweis:** Das ist eine Auswertung der Vertragstexte, keine Rechtsberatung. Die Ergebnisse stehen in `src/content/legalTexts.js` (`DATA_RECIPIENTS` und die Vereinbarung).

## Überblick

| Anbieter | Fassung | Vertragspartner | Ort der Verarbeitung | Absicherung Drittland | Besondere Kategorien (Art. 9) | Meldung Datenpanne |
|---|---|---|---|---|---|---|
| one.com | 17.06.2025 | One.com A/S (DK) | Kopenhagen; Systemüberwachung auch aus Indien | Garantien wie EU-Standardvertragsklauseln (5.7) | nicht geregelt | 48 h (4.8) bzw. 72 h (Anlage 2) |
| Anthropic | 24.02.2025 | „die Anthropic-Gesellschaft, die den Vertrag geschlossen hat“ | USA | EU-Standardvertragsklauseln Modul 2, irisches Recht | **„None“ (Schedule 1 B.3)** | 48 h (G.1) |
| OpenAI | v.010126 | OpenAI Ireland Ltd. (für EWR-Kunden) | Irland, Weitergabe in die USA | EU-Standardvertragsklauseln oder Angemessenheitsbeschluss (4.1) | **„nicht vorgesehen“** (Schedule 1 Nr. 5) | ohne schuldhaftes Zögern (2.7) |
| Supabase | Version 1, 01.08.2026 | Supabase Pte. Ltd. (Singapur) | gewählte Region (eu-west-1, Irland), Betreuung weltweit | EU-Standardvertragsklauseln Modul 2, irisches Recht | **ausdrücklich vorgesehen**, mit Einwilligung (4(d), Anlage 3) | 48 h, soweit möglich (10) |
| Vercel | 17.03.2026, gültig ab 31.03.2026 | Vercel Inc. (USA) | USA, weltweit | EU-Standardvertragsklauseln Modul 2, irisches Recht | **verboten** in Kundendaten (Schedule 1 Nr. 6) | ohne schuldhaftes Zögern (8.c) |

## Was nicht passt (vor dem Start klären)

1. **Anthropic: „Special categories: None“.**
   - Das DPA geht davon aus, dass keine besonderen Kategorien übermittelt werden.
   - Die App schickt Gesprächsinhalte mit Gesundheits- und Gefühlsdaten.
   - Für den Anwalt: Reicht das DPA trotzdem? Gibt es bei Anthropic eine Fassung bzw. Zusatzvereinbarung für solche Daten?
   - Außerdem ist offen, mit welcher Gesellschaft der Vertrag besteht (Anthropic PBC oder eine EU-Gesellschaft). Das steht in den Commercial Terms.
2. **OpenAI: sensible Daten „nicht vorgesehen“.**
   - Die erste Nachricht eines Gesprächs geht an OpenAI, sobald die Lernbasis an ist (CODE-2). Sie kann Gesundheitsangaben enthalten.
   - Solange `RAG_LEARNING_ENABLED` aus ist bzw. es keine freigegebenen Einträge gibt, bekommt OpenAI nichts. Seit Migration 041 ist die Lernbasis leer.
   - **Empfehlung:** Lernbasis aus lassen, bis das geklärt ist.
3. **Vercel: Das DPA gilt nur für Pro- und Enterprise-Pläne** (Einleitung).
   - Läuft das Projekt auf dem kostenlosen Hobby-Plan, gibt es keinen Auftragsverarbeitungsvertrag.
   - Nach den Nutzungsbedingungen von Vercel ist der Hobby-Plan außerdem nur für private, nicht kommerzielle Nutzung gedacht. Bitte im Vercel-Dashboard nachsehen.
4. **Vercel als eigener Verantwortlicher:** Nutzungs- und Zugriffsdaten (z. B. IP-Adressen) verarbeitet Vercel teilweise selbst als Verantwortlicher (Ziffer 4.b, Schedule 1 Nr. 2.b). Das gehört so in die Datenschutzerklärung.

## Was die Verträge nicht regeln

- **Training und Speicherfristen bei Anthropic und OpenAI:**
  - Beide DPAs binden die Verarbeitung an die Erbringung des Dienstes (Anthropic B.2/B.3, OpenAI 1.2).
  - Weder „kein Training“ noch eine Frist wie „30 Tage“ steht dort ausdrücklich.
  - Beides steht in den Commercial Terms bzw. Datenrichtlinien. **Diese Dokumente nachreichen**, dann kann die letzte Klammer dazu weg.
- **Data Privacy Framework (DPF):** Kein DPA stützt sich darauf. Alle nutzen die EU-Standardvertragsklauseln. Die Vereinbarung nennt deshalb nur diese.

## Für deine Abläufe

- **Unterauftragnehmer-Listen abonnieren.** Einspruchsfristen nach Benachrichtigung:

  | Anbieter | Einspruchsfrist | So abonnieren |
  |---|---|---|
  | Supabase | 5 Tage (6.3) | Anmeldung auf der Subprocessor-Seite |
  | Vercel | 5 Tage (7.c) | E-Mail an privacy@vercel.com |
  | Anthropic | 15 Tage (C.3) | – |
  | OpenAI | 30 Tage (2.9) | – |
  | one.com | 14 Tage (5.2) | – |

  Ohne Abo erfährst du von neuen Unterauftragnehmern bei Supabase und Vercel nichts.
- **Datenpannen:** Meldet ein Anbieter einen Vorfall, beginnt deine eigene 72-Stunden-Frist gegenüber der Aufsichtsbehörde. Die Meldewege der Anbieter (oben) gehören in den Notfallplan.
- **Löschung nach Vertragsende:** Anthropic und Supabase innerhalb von 30 Tagen, Vercel und one.com „in angemessener Zeit“, OpenAI auf Weisung.
