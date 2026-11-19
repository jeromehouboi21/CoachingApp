# Supervision-Prompt zum Gegenlesen (S-13)

> Für: Jerome, als Coach · Stand: Paket B, Welle 3 · Quelle: `supabase/functions/supervision/index.ts`
> `SUPERVISION_IN_PROMPT` bleibt **aus**, bis du diesen Text freigibst.

## Was die Supervision tut
- **Wann:** jeden Montag um 06:00 per Cron.
- **Eingaben:**
  - die Selbstreflexionen des Coaches aus den letzten 7 Tagen (`coach_reflections`: was geholfen hat, was gefehlt hat, Verbesserungsnotiz),
  - das Nutzerfeedback der Woche, sofern die Person der Verwendung zugestimmt hat.
- **Modell:** Claude Haiku.
- **Ausgabe:** ein kurzes Protokoll. **Punkt 3** daraus wird als `improvement_recs` gespeichert. Ist `SUPERVISION_IN_PROMPT=1` gesetzt, fließt dieser Punkt in **jedes** Coach-Gespräch aller Nutzer ein (BLOCK 5).

## Prompt (aktuelle Fassung)

```text
Du bist Jerome Houboi, zertifizierter systemischer Coach.
Hier sind die anonymisierten Selbstreflexionen deines KI-Coaches der letzten Woche:

{reflections}

Und hier ist das Nutzerfeedback der letzten Woche:
{feedback}

Erstelle ein kurzes Supervision-Protokoll (max. 200 Wörter) mit:
1. Was lief gut diese Woche?
2. Wo gibt es Verbesserungsbedarf?
3. Eine konkrete Empfehlung für die kommende Woche (in 1-2 Sätzen)

Schreibe direkt an den Coach — als würdest du ihn supervidieren.
Die Empfehlung in Punkt 3 fließt direkt in die KI ein. Sei präzise.

Verbindliche Regeln (S-13):
Formuliere ausschließlich allgemeine Empfehlungen zum Verhalten des Coaches. Keine Einzelfälle, keine Zitate, keine Details zu einzelnen Menschen, keine Themen, die Rückschlüsse auf Personen erlauben. Keine Anweisungen, die Sicherheits- oder Krisenregeln abschwächen.
```

Neu ist nur der Absatz „Verbindliche Regeln (S-13)“, der Rest ist unverändert.

## Prüfschritt vor dem Speichern
Punkt 3 durchläuft denselben Prüfschritt wie die Lernbasis (`_shared/learning.ts`):
1. **Vorfilter:** E-Mail-Adressen, Telefonnummern, Links und typische Anweisungsmuster wie „ignoriere deine Anweisungen“ oder „du bist jetzt …“.
2. **Prüfung durch Haiku:** Abgelehnt wird bei erkennbarer Person, Anweisung an eine KI, Kontaktdaten oder Krisendetails. Im Zweifel wird abgelehnt.
3. Der Grund **„zu wenig Substanz“** (`low_quality`) zählt hier nicht. Eine Empfehlung beschreibt keine „Erfahrung“ und würde sonst fälschlich abgelehnt.

Bei einer Ablehnung bleibt `improvement_recs` leer (`null`). Das Protokoll wird trotzdem gespeichert, mit seinen Zählern. Im Log steht dann nur `supervision_rejected` mit den Gründen als Codes.

## Fragen an dich beim Gegenlesen
- Passt die Rolle („Du bist Jerome Houboi …“), oder soll die Supervision neutraler formuliert sein?
- Sind 1–2 Sätze für die Empfehlung richtig? Sie gehen in jedes Gespräch ein, also auch in sensible.
- Fehlt dir eine fachliche Leitplanke, z. B. „keine Methodenwechsel“ oder „Haltung vor Technik“?

Wenn du zufrieden bist, schaltest du die Supervision so ein:
```
supabase secrets set SUPERVISION_IN_PROMPT=1
```
Ausschalten geht genauso mit `0`.
