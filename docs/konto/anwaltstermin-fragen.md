# Friedensstifter – Fragen für den Anwaltstermin (Rechtstexte v2.0)

**Stand:** 20.11.2026 · **Betreiber:** Jerome Houboi, Einzelunternehmer
**Gegenstand:** Coaching-Vereinbarung v2.0, Einwilligung nach Art. 9 DSGVO, Datenschutzerklärung (in Überarbeitung)

## Kurz zur App

Friedensstifter ist eine Web-App (PWA) für Erwachsene ab 18. Ein KI-Begleiter führt Coaching-Gespräche nach systemischen Prinzipien. Er ersetzt keine Therapie und ist kein Notfalldienst.

- **Gespräche:** Die Gespräche werden gespeichert und ausgewertet. Daraus entstehen ein Gedächtnis des Begleiters, Erkenntnisse und Muster für den Nutzer sowie eine Krisenerkennung.
- **Gesundheitsdaten:** Die Inhalte enthalten regelmäßig Angaben zur seelischen Gesundheit, also besondere Kategorien nach Art. 9.
- **Rechtsgrundlage:** ausdrückliche Einwilligung, getrennt von der Coaching-Vereinbarung (zwei Häkchen). Ohne die Einwilligung lässt sich der Dienst nicht nutzen.
- **Dienstleister:**

  | Dienstleister | Aufgabe | Sitz bzw. Standort |
  |---|---|---|
  | Supabase | Datenbank | Irland; Vertragspartner Supabase Pte. Ltd., Singapur |
  | Anthropic | KI | USA |
  | OpenAI | Vektorberechnung | Vertragspartner OpenAI Ireland Ltd., Verarbeitung auch in den USA |
  | Vercel | Auslieferung | USA |
  | one.com | E-Mail | Dänemark, Systemüberwachung auch aus Indien |

  Alle Verträge zur Auftragsverarbeitung (DPAs) liegen vor. Die Auswertung steht in `dpa-auswertung.md`.
- **Abo:** Ein bezahltes Abo ist geplant, aber noch nicht gebaut. Die Abo-Texte werden erst mit dem Start der Zahlung angezeigt.

---

## A. Offene Fragen in den Texten (blockieren die Freigabe)

### 1. Anthropic-DPA: „Special categories: None“

- **Was die App tut:** Bei jeder Nachricht gehen der Gesprächsverlauf und Kontext aus früheren Gesprächen an die API von Anthropic. Das sind Gedächtnis-Einträge, Personenprofil und Zusammenfassungen, also Gesundheits- und Gefühlsdaten. Zusätzlich laufen Auswertungen nach dem Gespräch und eine Krisenerkennung ebenfalls über Anthropic.
- **Was das DPA sagt:** Das Anthropic DPA vom 24.02.2025 nennt in Schedule 1, B.3 „Special categories of personal data (if applicable): None.“ Die EU-Standardvertragsklauseln (Modul 2) sind einbezogen.
- **Frage:**
  - Trägt der Vertrag die Übermittlung von Art.-9-Daten trotzdem?
  - Braucht es eine Ergänzung oder eine andere Vertragsfassung?
  - Mit welcher Anthropic-Gesellschaft besteht der Vertrag? Das steht in den Commercial Terms.

### 2. OpenAI-DPA: sensible Daten „nicht vorgesehen“

- **Was die App tut:**
  - Ist die Lernbasis eingeschaltet, geht die erste Nachricht eines Gesprächs (bis 2.000 Zeichen) zur Vektorberechnung an OpenAI.
  - Nach Einwilligung im Profil gehen zusätzlich anonymisierte, geprüfte Erfahrungen dorthin.
  - Derzeit ist die Lernbasis aus und leer. Aktuell erhält OpenAI nichts.
- **Was das DPA sagt:** OpenAI DPA v.010126, Schedule 1 Nr. 5: „No sensitive data is intended to be transferred unless the user includes it unexpectedly in unstructured data.“
- **Frage:**
  - Ist die Übermittlung der ersten Nachricht damit vereinbar?
  - Oder darf nur bereits anonymisierter Text an OpenAI gehen?

### 3. Kopplungsverbot: Supervision als Teil der Pflicht-Einwilligung

- **Was die App tut:**
  - Nach jedem Gespräch hält die KI fest, was geholfen hat und was gefehlt hat. Erkennbare Angaben sind dabei per Anweisung und automatischer Prüfung ausgeschlossen.
  - Wöchentlich werden diese Notizen aller Nutzer zu allgemeinen Empfehlungen zusammengefasst. Die Empfehlungen fließen in die Antworten des Begleiters für alle ein.
  - Die Notizen werden nach 12 Monaten gelöscht, die Empfehlungen nach 24 Monaten.
- **Text heute:** Die Pflicht-Einwilligung (`CONSENT_ART9_CHECKBOX`) enthält: „Außerdem darf die KI aus meinen Gesprächen allgemein lernen, was im Coaching hilft, ohne Zitate und ohne Angaben zu mir.“
- **Frage:**
  - Ist das mit Art. 7 Abs. 4 DSGVO vereinbar, obwohl der Dienst ohne diese Einwilligung nicht nutzbar ist?
  - Falls nein: eigene, freiwillige Einwilligung (technisch umsetzbar) oder eine andere Rechtsgrundlage?

### 4. Krisen-Eintrag: Rechtsgrundlage und Dauer

- **Was die App tut:**
  - Bei Hinweisen auf eine akute Krise zeigt die App Hilfsangebote und speichert einen Ausschnitt der Nachricht (höchstens 300 Zeichen).
  - Der Ausschnitt wird nach der Sichtung durch den Betreiber gelöscht, spätestens nach 90 Tagen.
  - Der Eintrag selbst (Zeitpunkt, Einstufung niedrig/mittel/hoch, Verweis auf das Gespräch, ohne Text) bleibt bis zum Ende des dritten Jahres nach dem Ereignis. Zweck: nachweisen können, dass Hilfsangebote angezeigt wurden.
- **Text heute:** „[Prüfen: Rechtsgrundlage Art. 9 Abs. 2 lit. f DSGVO und Dauer]“
- **Frage:**
  - Trägt Art. 9 Abs. 2 lit. f diese Aufbewahrung, und sind drei Jahre angemessen?
  - **Spannung:** Mit dem Konto wird auch der Eintrag sofort gelöscht. Bei gelöschten Konten entfällt der Nachweis also. Soll der Eintrag eine Kontolöschung überdauern (dann ohne Nutzerbezug?), oder ist das so in Ordnung?

### 5. Haftung beim kostenlosen Kennenlernen

- **Text heute:** „Für kostenlose Leistungen hafte ich nur bei Vorsatz und grober Fahrlässigkeit sowie bei einer Verletzung von Leben, Körper oder Gesundheit.“
- **Kontext:** Die ersten drei Gespräche sind kostenlos (höchstens 100 Nachrichten je Gespräch). Danach bleiben Spiegel und Erkenntnisse kostenlos sichtbar.
- **Frage:** Ist diese Beschränkung zulässig (Schenkungs- bzw. Leihe-Analogie), und ist sie für Verbraucher wirksam formuliert?

---

## B. Weitere Punkte zur Bestätigung (im Text bereits ausformuliert)

6. **Pflicht-Einwilligung insgesamt:** Ohne Art.-9-Einwilligung keine Nutzung. Begründung: Der Begleiter beruht darauf, sich an Gespräche zu erinnern. Trägt das unter Art. 7 Abs. 4?
7. **Betreiberzugang:** „Ich lese deine Gespräche nicht. Ausnahmen: Du bittest mich darum, ein technischer Fehler erfordert meinen Eingriff, ich bin gesetzlich dazu verpflichtet, oder es geht um einen Krisenausschnitt … Diese Zugriffe werden derzeit nicht gesondert protokolliert.“ Reicht das, oder ist eine Protokollierung erforderlich?
8. **Neue Fassung der Vereinbarung:**
   - Die App ist gesperrt, bis der Nutzer zustimmt.
   - Erinnerung per E-Mail nach zwei Wochen, Löschung nach weiteren vier Wochen ohne Antwort.
   - Stichtag ist die Veröffentlichung. Wer sich nicht anmeldet, erfährt erst durch die E-Mail davon.
   - Ist dieses Vorgehen zulässig?
9. **Bestandsnutzer:** Die bisherigen Einwilligungen nach Version 1.0 werden durch v2.0 ersetzt. Bis zur Zustimmung ist die App gesperrt, Export und Löschung bleiben möglich. Ausreichend?
10. **Vercel als eigener Verantwortlicher** für Zugriffsdaten wie IP-Adressen (DPA Ziffer 4.b): Wie gehört das in die Datenschutzerklärung?
11. **one.com:** Zugriff zur Systemüberwachung aus Indien, abgesichert laut DPA über „geeignete Garantien wie Standardvertragsklauseln“. Genügt der Hinweis in der Datenschutzerklärung?
12. **KI-Hinweis (Art. 50 Abs. 1 KI-VO):** dauerhaft „Du schreibst mit einer KI.“ unter dem Eingabefeld, dazu Hinweise im Einstieg und in der Vereinbarung. Ausreichend?
13. **Altersgrenze:** 18+ per Selbstauskunft (Häkchen), Hinweis auf die Nummer gegen Kummer. Ausreichend?
14. **Schweigepflicht:** Die Vereinbarung sagt, dass der Betreiber keiner gesetzlichen Schweigepflicht unterliegt und die Vertraulichkeit vertraglich ist. Richtig dargestellt?
15. **Später, mit dem Abo:** Widerrufsbelehrung nach Muster in Ich-Form statt Wir-Form, Kündigungsbutton (§ 312k), Bestellbutton (§ 312j), Häkchen „sofort beginnen“.

---

## Unterlagen

- **Texte:** `src/content/legalTexts.js`, alle Texte der Vereinbarung und Einwilligung (als Ausdruck mitnehmen)
- **Verträge:** `docs/DPA/` (one.com, Anthropic, OpenAI, Supabase, Vercel) und `docs/konto/dpa-auswertung.md`
- **Abgleich Text ↔ App:** `docs/konto/legaltexte-abgleich.md`
- **Abläufe zu den Betroffenenrechten:** `docs/konto/ablaeufe-rechte.md`
- **Noch fehlend:** Commercial Terms bzw. Datenrichtlinien von Anthropic und OpenAI (Training, Speicherfristen)
- **In Überarbeitung:** Datenschutzerklärung (passt noch nicht zu den Empfängern und Fristen)
