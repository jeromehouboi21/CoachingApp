# Abläufe zu den Rechtstexten v2.0 (Paket K, E4 / B9)

**Stand:** 20.11.2026, Entwurf · **Für:** Jerome (Betreiber)
Die Coaching-Vereinbarung verspricht einige Dinge, die nicht die App erledigt, sondern du. Hier steht, wie. SQL-Vorlagen: `supabase/diagnostics/k-legal-ablaeufe.sql`. Fristen in `[Offen]` trägst du hier **und** in `src/content/legalTexts.js` gleich ein.

## 1. Erneute Zustimmung ausstehend (`RECONSENT.pendingText`)

- **Wann:** einmal pro Woche, solange nach einer neuen Fassung Zustimmungen ausstehen. Stichtag ist der Tag, an dem die neue Fassung live gegangen ist.
- **Schritte:**
  1. Abfrage 1b: Konten ohne Zustimmung v2.0.
  2. Wer sich seit zwei Wochen nicht entschieden hat, bekommt eine E-Mail von dir. Inhalt: Es gibt eine neue Fassung, so stimmst du zu, so lädst du deine Daten herunter. Kein Inhalt aus dem Konto.
  3. Kommt innerhalb von weiteren vier Wochen keine Zustimmung, löschst du das Konto: Admin-Bereich bzw. Supabase → Authentication → Users → Delete user. Die CASCADE-Ketten löschen alles Weitere.
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

- Abfrage 2 (inaktive Konten). Mail mit Frist von zwei Wochen und dem Hinweis auf den Datendownload, danach löschen wie in 1.

## 5. Sperre bei Missbrauch

- Supabase → Authentication → Users: Nutzer sperren (im Dashboard prüfen, ob angeboten, sonst löschen). Bei Angriffen zusätzlich der Notfallplan (`docs/security/notfallplan.md`).

## 6. Löschung unvollständig (Alarm `delete_incomplete` / `auth_delete_failed`)

Das Löschfenster verspricht: „Ich bin informiert und kümmere mich darum. Du bekommst eine Mail, sobald alles gelöscht ist.“

- **Wann:** sobald die Alarm-Mail kommt (Regel `delete_incomplete`, Schwelle 1).
- **Schritte:**
  1. Im Log (`app_logs`, Code `delete_incomplete`) steht, welcher Schritt fehlschlug (`failedSteps`), und die Nutzer-ID. Inhalte stehen dort nicht.
  2. Ursache beheben bzw. die Löschung über Supabase → Authentication → Users → Delete user abschließen. Die CASCADE-Ketten löschen den Rest.
  3. Prüfen: `supabase/security/deletion-check.sql` mit der Nutzer-ID → überall 0.
  4. Der Person eine kurze Mail schicken, dass alles gelöscht ist. Die Adresse findest du vor dem Löschen unter Authentication → Users. Kein Inhalt aus dem Konto.
- **Festhalten:** Datum, Nutzer-ID, Ursache, Erledigung.

Nicht zugestellte Bestätigungsmails nach einer erfolgreichen Löschung erscheinen nur in der Wochenübersicht (`account_deleted_mail_failed`). Die Löschung ist dann trotzdem vollständig. Eine Adresse für eine zweite Mail gibt es nicht mehr.

## Offen

- Fristen eintragen (auch in `legalTexts.js`: `RECONSENT.pendingText`, „Wann die Vereinbarung endet“).
- Mit dem Anwalt klären, ob die Fristen und der Ablauf in 1 so tragen.
