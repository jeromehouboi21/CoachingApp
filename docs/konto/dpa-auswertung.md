# Auswertung der Auftragsverarbeitungsverträge (DPAs)

**Stand:** 20.11.2026 · **Für:** Jerome und den Anwaltstermin (R-1/R-3)
**Quellen:** `docs/DPA/` (one.com, Anthropic, OpenAI, Supabase, Vercel, Stripe)
**Hinweis:** Das ist eine Auswertung der Vertragstexte, keine Rechtsberatung. Die Ergebnisse stehen in `src/content/legalTexts.js` (`DATA_RECIPIENTS` und die Vereinbarung).

## Überblick

| Anbieter | Fassung | Vertragspartner | Ort der Verarbeitung | Absicherung Drittland | Besondere Kategorien (Art. 9) | Meldung Datenpanne |
|---|---|---|---|---|---|---|
| one.com | 17.06.2025 | One.com A/S (DK) | Kopenhagen; Systemüberwachung auch aus Indien | Garantien wie EU-Standardvertragsklauseln (5.7) | nicht geregelt | 48 h (4.8) bzw. 72 h (Anlage 2) |
| Anthropic | 24.02.2025 | „die Anthropic-Gesellschaft, die den Vertrag geschlossen hat“ | USA | EU-Standardvertragsklauseln Modul 2, irisches Recht | **„None“ (Schedule 1 B.3)** | 48 h (G.1) |
| OpenAI | v.010126 | OpenAI Ireland Ltd. (für EWR-Kunden) | Irland, Weitergabe in die USA | EU-Standardvertragsklauseln oder Angemessenheitsbeschluss (4.1) | **„nicht vorgesehen“** (Schedule 1 Nr. 5) | ohne schuldhaftes Zögern (2.7) |
| Supabase | Version 1, 01.08.2026 | Supabase Pte. Ltd. (Singapur) | gewählte Region (eu-west-1, Irland), Betreuung weltweit | EU-Standardvertragsklauseln Modul 2, irisches Recht | **ausdrücklich vorgesehen**, mit Einwilligung (4(d), Anlage 3) | 48 h, soweit möglich (10) |
| Vercel | 17.03.2026, gültig ab 31.03.2026 | Vercel Inc. (USA) | USA, weltweit | EU-Standardvertragsklauseln Modul 2, irisches Recht | **verboten** in Kundendaten (Schedule 1 Nr. 6) | ohne schuldhaftes Zögern (8.c) |
| Stripe *(geplant, Abo)* | Stand 28.09.2026 | „die im Vertrag genannte Stripe-Gesellschaft“ (1), steht im Stripe-Servicevertrag | weltweit, insbesondere Stripe, LLC (USA) (6.1, 6.2) | Data Transfers Addendum: EU-Standardvertragsklauseln Module 1–3, auch Data Privacy Framework (6.1, 8) | „falls zutreffend“ möglich (2), für uns ohne Belang: an Stripe gehen nur Nutzer-ID, E-Mail und Zahlungsdaten | 48 h bei DSGVO-Daten (3.1(f)) |

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
3. ~~**Vercel: Das DPA gilt nur für Pro- und Enterprise-Pläne** (Einleitung).~~ **Geklärt 20.11.2026:** Das Team läuft auf dem Pro-Plan (aktiv). Das DPA gilt, kommerzielle Nutzung ist erlaubt. Den Plan nicht auf Hobby zurückstufen.
4. **Vercel als eigener Verantwortlicher:** Nutzungs- und Zugriffsdaten (z. B. IP-Adressen) verarbeitet Vercel teilweise selbst als Verantwortlicher (Ziffer 4.b, Schedule 1 Nr. 2.b). Das gehört so in die Datenschutzerklärung.
5. **Stripe überwiegend als eigener Verantwortlicher** (Ziffer 2, Tabelle „Data Processing Roles“):
   - Auftragsverarbeiter nur für den Betrieb der Plattform und die Bereitstellung der Dienste.
   - Eigener Verantwortlicher für Auswahl von Banken und Zahlungsanbietern, Betrugserkennung, Geldwäsche- und KYC-Pflichten, Anfragen von Behörden sowie die Weiterentwicklung der eigenen Produkte.
   - Das gehört so in die Datenschutzerklärung (Hinweis auf die Datenschutzerklärung von Stripe). Für den Anwalt: Teil C der Fragenliste.
   - Nicht gelesen: Data Transfers Addendum (welches Recht für die Standardvertragsklauseln gilt), Stripe-Servicevertrag (welche Stripe-Gesellschaft Vertragspartner ist).

## Was die Verträge nicht regeln

- **Training und Speicherfristen bei Anthropic und OpenAI:**
  - Beide DPAs binden die Verarbeitung an die Erbringung des Dienstes (Anthropic B.2/B.3, OpenAI 1.2).
  - Weder „kein Training“ noch eine Frist wie „30 Tage“ steht dort ausdrücklich.
  - Beides steht in den Commercial Terms bzw. Datenrichtlinien. **Diese Dokumente nachreichen**, dann kann die letzte Klammer dazu weg.
- **Data Privacy Framework (DPF):** Keines der fünf bisherigen DPAs stützt sich darauf. Sie nutzen die EU-Standardvertragsklauseln, die Vereinbarung nennt deshalb nur diese. Stripe nennt das DPF zusätzlich zu den Standardvertragsklauseln. Für die Abo-Texte prüfen, welche Grundlage genannt wird.

## Für deine Abläufe

- **Unterauftragnehmer-Listen abonnieren.** Einspruchsfristen nach Benachrichtigung:

  | Anbieter | Einspruchsfrist | So abonnieren |
  |---|---|---|
  | Supabase | 5 Tage (6.3) | Anmeldung auf der Subprocessor-Seite |
  | Vercel | 5 Tage (7.c) | E-Mail an privacy@vercel.com |
  | Anthropic | 15 Tage (C.3) | – |
  | OpenAI | 30 Tage (2.9) | – |
  | one.com | 14 Tage (5.2) | – |
  | Stripe | 30 Tage, Ankündigung 30 Tage vorher (3.2(a)) | E-Mail-Benachrichtigung auf der Sub-Processors-Liste (stripe.com/legal/service-providers) |

  Ohne Abo erfährst du von neuen Unterauftragnehmern bei Supabase und Vercel nichts.
- **Datenpannen:** Meldet ein Anbieter einen Vorfall, beginnt deine eigene 72-Stunden-Frist gegenüber der Aufsichtsbehörde. Die Meldewege der Anbieter (oben) gehören in den Notfallplan.
- **Löschung nach Vertragsende:** Anthropic und Supabase innerhalb von 30 Tagen, Vercel und one.com „in angemessener Zeit“, OpenAI auf Weisung. Stripe nach Wahl Löschung oder Rückgabe, außer was Stripe für eigene Pflichten oder nach Gesetz länger speichern darf (3.1(h)), ohne konkrete Fristen.
- **Stripe-DPA im Ordner:** Das PDF (`docs/DPA/Stripe DPA.pdf`) enthält den Text nur als Grafik und ließ sich nicht maschinell lesen. Ausgewertet wurde die öffentliche Fassung auf stripe.com/legal/dpa, Stand 28.09.2026. Bitte prüfen, ob das PDF dasselbe Datum trägt.
