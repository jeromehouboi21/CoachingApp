# Paket A0 „Aufräumen“ – Bericht

**Stand:** 20.11.2026 · **Handoff:** `docs/Neues_Zielbild/handoff-reihenfolge-offene-pakete.md`, Abschnitt 3 · **Branch:** `chore/a0-aufraeumen`

Ohne Migration und ohne neue Abhängigkeit. Die Bezahlung bleibt aus: `PAYMENTS_ENABLED` im Frontend ist nicht angefasst.

**Geprüft:**
- Build mit allen Prüfungen nach dem Build: grün
- Syntaxprüfung der drei geänderten Functions: ok
- `npm run security:test`: steht noch aus, nach dem Deploy durch Jerome

## A0-1 Altlasten in `ARCHITECTURE.md`

**Dateibaum:**
- Vorher stand bei `HomeScreen` noch „Dashboard mit Tool-Kacheln“. Jetzt steht dort „Heute (U3): Zustände A · D · B · C2 · C aus `lib/todayState.js`“.
- Abweichung vom Handoff: Das Handoff spricht von „Zuständen A–E“. Im Code gibt es aber genau **A, D, B, C2, C** (`todayState.js`), einen Zustand E gibt es nicht. Der Abschnitt 4.1 zu HomeScreen war schon richtig.

**Stand-Zeile oben:** jetzt chronologisch: K W1 → K W2 → **K W3** → K W4 → Paket K abgeschlossen → P → Z.

**Onboarding-Reste:**
- `CoachingAgreementScreen` verweist jetzt auf `/start/3` bzw. die erneute Zustimmung.
- `useAuth.signUp`: Die Metadaten kommen aus `/start/4`, nur Version 2.0.
- Der Einladungscode wird im Einstieg gemerkt.
- `profiles.onboarding_*` ist als Altbestand gekennzeichnet.
- Den Profil-Abschnitt habe ich geprüft: Er enthielt keinen Onboarding-Text mehr.

**Tabelle Stripe-Dashboard:** Die Zeile „Sprache“ ist geschlossen (A0-2).

## A0-2 Stripe auf Deutsch

`locale: 'de'` steht jetzt in `create-checkout-session` (Bezahlseite) und in `create-portal-session` (Kundenportal). Beide Optionen sind feste Parameter der Stripe-API, auch in `npm:stripe@23.1.0`.

**Wirksam erst nach dem Deploy:** `supabase functions deploy create-checkout-session create-portal-session chat --no-verify-jwt`. `chat` gehört wegen A0-4 dazu.

**Beobachtung, nicht umgesetzt (kein Scope):**
- Rechnungs- und Quittungsmails von Stripe richten sich nach der Sprache des Kunden (`preferred_locales`).
- Das ließe sich beim Anlegen des Kunden mit `preferred_locales: ['de']` setzen. Ein kleiner Schritt für J-Z3, falls die Mails englisch ankommen.

## A0-3 Fundstellen „Frankfurt“ / `eu-central-1`

Suche: `rg -n -i "frankfurt|eu-central-1" src supabase docs scripts public`

**Code (`src`, `supabase`, `scripts`, `public`):**

| Fundstelle | Inhalt | Ergebnis |
|---|---|---|
| `src/lib/functions.js:4` | Kommentar „… bis dahin Frankfurt“ | richtig (Historie), unverändert |
| `src/content/securityMeasures.js:45` | Beleg „vorher Frankfurt, Paket C-1“ | richtig (Historie), unverändert |

Die Technik läuft vollständig auf `eu-west-1`.

**Rechtstexte:** In `legalTexts.js` gibt es **keine Fundstelle**. Supabase steht dort als „Rechenzentrum in Irland (EU, Region eu-west-1)“. Nichts zu melden.

**Doku korrigiert:** `docs/security/paket-c-abschlussbericht.md`
- Z. 12: S-09 mit dem Zusatz „seit 20.11.2026 `eu-west-1`/Irland“
- Z. 79: Der Satz „nur die Edge Functions laufen … in Frankfurt“ ist auf die Vergangenheit gestellt, mit dem Zusatz, dass sie seit dem 20.11. in Irland laufen.

**Doku bewusst unverändert:** Diese Dokumente beschreiben den Stand ihrer Zeit. Ein nachträgliches Umschreiben würde die Historie verfälschen.

| Fundstelle | Art |
|---|---|
| `docs/Neues_Zielbild/friedensstifter-zielbild-umsetzungsplan-v1.md:192` | Plan |
| `docs/Neues_Zielbild/handoff-security-paket-c.md` (Z. 9, 182, 204, 640, 687) und Kopie `docs/security/handoff-security-paket-c.md` | Handoff (Auftrag C-1) |
| `docs/security/friedensstifter-security-paket-c-design-v2.md` (Z. 16, 41, 118–123) | Lösungsdesign |
| `docs/security/friedensstifter-security-paket-b-design-v1.md:398`, `docs/security/paket-b-abschlussbericht.md:73` | Design und Bericht Paket B |
| `docs/konto/friedensstifter-konto-vertrauen-konzept-v1.md:279–280` | Konzept Paket K (vor der Klärung der Region) |
| `docs/konto/paket-k-discovery.md:62, 79–80`, `docs/konto/paket-k-abschlussbericht.md:12, 23` | Bestandsaufnahme bzw. Bericht, beschreiben die Korrektur selbst |
| `docs/Neues_Zielbild/handoff-reihenfolge-offene-pakete.md` | dieses Handoff |

**Für Jerome:** In `docs/konto/legaltexte-abgleich.md` stehen noch zwei **offene Häkchen**, obwohl die Texte schon korrigiert sind:
- **A1** (Z. 15): Bei Supabase stand dort „Server in Frankfurt“. `DATA_RECIPIENTS` sagt inzwischen „Irland“.
- **D1** (Z. 233): „Frankfurt/Ireland“ in `DatenschutzScreen.jsx`. Im Code gibt es keine Fundstelle mehr.

Das ist deine Checkliste, abhaken kannst du sie selbst.

## A0-4 „Begleitung unbegrenzt“

Suche:
- `rg -n -i "unbegrenzt|unlimited" src supabase/functions`
- zusätzlich `ohne Grenze|so oft du|beliebig viele|ohne Limit|unbeschränkt`

| Fundstelle | Vorher | Nachher |
|---|---|---|
| `supabase/functions/chat/index.ts:434` (`HOWTO_SYSTEM_PROMPT`, Wissen der FAQ in „Wie es funktioniert“) | „Begleitung (neue Gespräche ohne Grenze, Preis noch offen; bis dahin Kontakt zu Jerome)“ | „Begleitung (neue Gespräche, mit 150 eigenen Nachrichten im Monat; ob sie schon buchbar ist und was sie kostet, steht auf der Seite „Begleitung“ im Profil; bis dahin Kontakt zu Jerome)“ |
| `src/screens/begleitung/BegleitungScreen.jsx:23` (Liste „Mit Begleitung“, nur ohne `PAYMENTS_ENABLED`) | „Neue Gespräche, so oft du möchtest“ | „Neue Gespräche, mit 150 eigenen Nachrichten im Monat“ (gleich mit und ohne Schalter) |

**Unverändert, weil richtig:**
- „Ruhemodus (kostenlos, unbegrenzt: Heute, Spiegel …)“ in derselben Prompt-Zeile, gemeint ist das Lesen.
- „im Spiegel vollständig sichtbar – ohne Grenze“.
- `HowItWorksScreen` sagt ohne Schalter „Was die Begleitung kostet, steht noch nicht fest.“, mit Schalter Preis und 150 Nachrichten.

**Rechtstexte:** `legalTexts.js:287` „Ich hafte unbeschränkt …“ ist die Haftungsklausel und hat mit der Begleitung nichts zu tun. Keine Fundstelle zur Begleitung.

**Sprachprinzip:** Die neuen Texte enthalten kein „müssen“, „immer“, „nie“ und kein „können nicht“.

**Hinweis:** Ein von Hand gesetztes `premium` (über den Admin-Bereich, ohne Stripe-Abo) hat weiterhin **kein** Monatskontingent (Beobachtung aus Paket Z). Der neue Text beschreibt das Abo. Wer die Begleitung heute über Jerome bekommt, hat faktisch mehr.

## A0-5 Bestandskonten nach U4 (für Jerome, J-7)

Im SQL Editor ausführen. Es liefert nur Zähler:

```sql
select plan, session_limit, count(*)
from public.profiles
group by 1, 2
order by 1, 2;
```

**So liest du das Ergebnis:**
- **`free` mit `session_limit = 3`:** Normalfall seit U4. Drei Kennenlern-Starts, danach Ruhemodus.
- **`free` mit `session_limit = 20`** sollte es nicht mehr geben. Migration 038 hat alle `free`-Konten mit 20 (Default aus 027) auf 3 gesetzt (`update … where plan = 'free' and session_limit = 20`). Taucht trotzdem eine 20 auf, gilt für dieses Konto:
  - Es hat bis zu **20 kostenlose Gespräche** statt 3 und kommt erst danach in den Ruhemodus.
  - Wahrscheinliche Ursachen: Das Konto hatte damals einen anderen Plan und wurde später auf `free` gesetzt, oder der Wert wurde im Admin-Bereich von Hand eingetragen.
  - Ob das so bleiben soll, entscheidest du. Ändern ginge im Admin-Bereich (individuelles Gesprächslimit).
- **`free` mit anderen Werten oder `null`:** von Hand gesetzt. `null` heißt unbegrenzte Starts.
- **`tester`:** eigenes Limit aus dem Admin-Bereich, `null` heißt unbegrenzt.
- **`premium`:** `session_limit` wirkt nicht, die Phase ist Begleitung. Mit Stripe-Abo gilt das Monatskontingent, von Hand gesetzt gibt es keines.
- **Nach dem Ende eines Abos** setzt der Webhook `plan = 'free'`. Dann zählt wieder `session_limit`, gegen alle bisher begonnenen Gespräche (`trial_sessions_used`). Meist heißt das sofort Ruhemodus.

## Weitere Beobachtungen (nicht umgesetzt)

- **`docs/architecture.md`** (die kürzere zweite Architekturdatei) ist an mehreren Stellen veraltet:
  - „Onboarding Step 4“ (Z. 56, 145)
  - „Unbegrenzte Gespräche“ (Z. 384)
  - Felder des alten Onboardings

  Sie gehört nicht zu A0. **Vorschlag:** Entweder in eine kurze Übersicht mit Verweis auf `ARCHITECTURE.md` umwandeln oder löschen. Das entscheidest du.
- **CLAUDE.md** beschreibt Paket Z noch nicht. Laut Handoff Paket Z wird sie nach J-Z3 aktualisiert.

## Für Jerome

1. **Mergen:** Diff prüfen und `chore/a0-aufraeumen` nach `main` mergen und pushen.
2. **Deployen:** `supabase functions deploy create-checkout-session create-portal-session chat --no-verify-jwt`. Keine Migration.
3. **Prüfen:** `npm run security:test`. Erwartet ist alles PASS.
4. **Ansehen:** die Häkchen A1/D1 in `legaltexte-abgleich.md`, dazu SQL A0-5 ausführen (J-7).
