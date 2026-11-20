# Abläufe zu den Rechtstexten v2.0 (Paket K, E4 / B9)

**Stand:** 20.11.2026, Entwurf · **Für:** Jerome (Betreiber)
Die Coaching-Vereinbarung verspricht einige Dinge, die nicht die App erledigt, sondern du. Hier steht, wie. SQL-Vorlagen: `supabase/diagnostics/k-legal-ablaeufe.sql`. Fristen in `[Offen]` trägst du hier **und** in `src/content/legalTexts.js` gleich ein.

## 1. Erneute Zustimmung ausstehend (`RECONSENT.pendingText`)

- **Wann:** alle [Offen: z. B. 2 Wochen] nach einer neuen Fassung.
- **Schritte:**
  1. Abfrage 1b: Konten ohne Zustimmung v2.0.
  2. Wer sich seit [Offen: Frist] nicht entschieden hat, bekommt eine E-Mail von dir. Inhalt: Es gibt eine neue Fassung, so stimmst du zu, so lädst du deine Daten herunter. Kein Inhalt aus dem Konto.
  3. Kommt innerhalb von [Offen: weitere Frist] keine Zustimmung, löschst du das Konto: Admin-Bereich bzw. Supabase → Authentication → Users → Delete user. Die CASCADE-Ketten löschen alles Weitere.
- **Festhalten** (ohne Inhalte): Datum der Mail, Datum der Löschung, Nutzer-ID.

## 2. Krisen-Sichtung (Vereinbarung, „Was mit deinen Daten passiert“)

- **Wann:** wöchentlich. Die Montags-Übersicht des Monitorings nennt die Zahl ungesichteter Ereignisse.
- **Schritte:**
  1. Abfrage 3a.
  2. Jedes Ereignis einzeln mit 3b ansehen, nur zum Zweck aus der Vereinbarung (Erkennung richtig? verbessern?).
  3. Danach mit 3c markieren. Der Ausschnitt wird in der folgenden Nacht geleert, spätestens nach 90 Tagen automatisch.
- Erkenntnisse zur Krisenerkennung ohne Zitat notieren.

## 3. Anfragen zu den Rechten per E-Mail (Art. 15–21, Widerruf)

| Anfrage | Was du tust | Frist |
|---|---|---|
| Auskunft, Kopie (Art. 15/20) | Auf „Daten herunterladen“ im Profil verweisen oder für die Person ausführen | 1 Monat |
| Berichtigung (Art. 16) | Feld im Dashboard korrigieren, Bestätigung per Mail | 1 Monat |
| Löschung (Art. 17), Widerruf der Einwilligung | Konto löschen (wie in 1), Bestätigung per Mail | unverzüglich |
| Einschränkung (Art. 18) | Konto sperren (Supabase → Authentication → Users, Sperre; im Dashboard prüfen, ob angeboten), Daten bleiben | 1 Monat |
| Widerspruch (Art. 21) | Gilt für Sicherheitsprotokolle (berechtigtes Interesse). Prüfen, ob zwingende Gründe überwiegen, sonst Protokolle des Kontos löschen. | 1 Monat |

- **Identität prüfen:** Die Antwort geht nur an die E-Mail-Adresse des Kontos.
- **Festhalten:** Eingang, Art der Anfrage, Erledigung (ohne Inhalte).

## 4. Kündigung kostenloser Konten durch dich

- Abfrage 2 (inaktive Konten). Mail mit Frist von [Offen: z. B. zwei Wochen] und dem Hinweis auf den Datendownload, danach löschen wie in 1.

## 5. Sperre bei Missbrauch

- Supabase → Authentication → Users: Nutzer sperren (im Dashboard prüfen, ob angeboten, sonst löschen). Bei Angriffen zusätzlich der Notfallplan (`docs/security/notfallplan.md`).

## Offen

- Fristen eintragen (auch in `legalTexts.js`: `RECONSENT.pendingText`, „Wann die Vereinbarung endet“).
- Mit dem Anwalt klären, ob die Fristen und der Ablauf in 1 so tragen.
