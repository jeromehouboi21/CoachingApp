# Handoff: Einstiegs-Rundgang (Paket R, „Rundgang durch die App“)

> **Für:** Claude Code · **Von:** Jerome (vorbereitet mit Claude) · **Stand:** 21.11.2026 · **Version:** v1
> **Grundlage:** `ARCHITECTURE.md`, `claude/friedensstifter-ux-konzept-kreislauf-v1.md` (Heute, Gespräch, Spiegel, `access_phase`), `claude/handoff-paket-k-konto-vertrauen.md` (Profil-Gliederung), Spielregeln aus Paket C/V/P
> **Design:** Canvas „Friedensstifter – Einstiegs-Rundgang“ (5 Rundgang-Screens + Profil-Eintrag), https://claude.ai/artifact/9uXnWkCwYW38dao7NLvzw6
> **Ziel:** Wer neu in der App ist, bekommt nach dem Login einen kurzen Rundgang in fünf Schritten: was die App ist und wo man was findet (Heute, Gespräch, Spiegel, Kreislauf). Der Rundgang kommt bei jedem App-Start wieder, bis der Nutzer „Nicht mehr anzeigen“ setzt oder drei Gespräche geführt hat. Im Profil lässt er sich jederzeit wieder öffnen.

**Abgrenzung:** Der neue Einstieg aus Paket K (W3, `/start/1–4`) erklärt **vor** der Registrierung, was einen erwartet und warum sich die App etwas merkt. Dieser Rundgang kommt **nach** dem Login und zeigt, **wo** man was findet. Beides bleibt getrennt. Die Karte „So funktioniert's“ auf Heute (Zustand A) bleibt unverändert.

---

## Entscheidungen

| # | Frage | Entscheidung |
|---|---|---|
| R-1 | Wann erscheint der Rundgang? | Nach dem Login und bei jedem App-Start, **einmal pro Sitzung**, nur auf Heute (`/`) ✅ 21.11. |
| R-2 | Wann endet er dauerhaft? | Haken „Nicht mehr anzeigen“ **oder** 3 geführte Gespräche, je nachdem, was zuerst kommt ✅ 21.11. |
| R-3 | Kennenlern-Satz auf Schritt 5 | nur bei `access_phase = 'kennenlernen'` ✅ 21.11. |
| R-4 | Wieder aufrufbar | Profil → Abschnitt „Dein Begleiter“ → „Rundgang durch die App“ ✅ 21.11. |
| R-5 | Wo wird der Haken gespeichert? | am Konto (`profiles.tour_dismissed_at`), gesetzt über eine schmale RPC. Nicht im Browser-Speicher (Empfehlung, Jerome bestätigt in J-R1) |

---

## 0. Spielregeln für Claude Code

Alle Regeln aus den Paketen A–C, V und P gelten weiter. Besonders wichtig hier:

1. **Branch** `feature/einstiegs-rundgang` von aktuellem `main`.
2. **Serverseitig nur das Nötigste:** eine Spalte, eine RPC. Der Schutz-Trigger auf `profiles` (Migration 024) wird **nicht** aufgeweicht.
3. **Keine echten Nutzerdaten im Rundgang.** Alle Grafiken zeigen feste Beispielinhalte. Der Rundgang ist wie Heute öffentlicher Raum (Designentscheidung 12).
4. **Kein Drängen.** „Überspringen“ ist ab Schritt 1 sichtbar. Keine Rückfrage beim Überspringen. Keine Coaching-Vokabeln.
5. **Keine stillen Fehler, Logs nur mit Codes** (`tour_*`), nie mit Inhalten.
6. **Keine neuen Pakete.** Kein Carousel-, Tour- oder Animations-Paket. Reines React + bestehende Styles.
7. **Keine Deploys.** An jedem **⛔ STOPP** an Jerome übergeben.

---

## 1. Was der Nutzer erlebt

```
Login / App-Start ──▶ Heute (/) ──▶ Rundgang erscheint als Vollbild-Overlay?
                                     │
                                     ├─ nein: tour_dismissed_at gesetzt
                                     │        oder ≥ 3 geführte Gespräche
                                     │        oder in dieser Sitzung schon gezeigt
                                     │        oder Start nicht auf Heute (Deep Link, Weiterarbeiten, laufendes Gespräch)
                                     │
                                     └─ ja:  1 Willkommen → 2 Heute → 3 Gespräch → 4 Spiegel → 5 Kreislauf
                                             unten auf jedem Schritt: [ ] Nicht mehr anzeigen      [Weiter →]
                                             oben: ← Zurück (ab Schritt 2) · Punkte · Überspringen
                                             Schritt 5: [Los geht's] schließt

Profil → „Rundgang durch die App“ ──▶ derselbe Rundgang, aber:
        kein Haken · „Überspringen“ heißt „Schließen“ · letzter Knopf „Fertig“ · danach zurück ins Profil
```

**Was der Haken bewirkt:** Ist er beim Schließen gesetzt (egal über welchen Weg: „Los geht's“, „Überspringen“, Esc), wird `tour_dismissed_at` gesetzt. Ohne Haken schließt „Überspringen“ nur für diese Sitzung.

---

## 2. Phase 0: Bestandsaufnahme

Antworten mit Pfad und Zeile in `docs/rundgang/paket-r-discovery.md`.

1. **Heute-Screen:** Datei und Komponente der Route `/`. Wie wird Zustand A–D bestimmt (`src/lib/todayState.js`)? Welche Daten lädt Heute beim Start schon (Gesprächszahl, `access_phase`)?
2. **„Geführtes Gespräch“:** Wie definiert `todayState.js` „Gespräch mit ≥ 3 Nachrichten“ (Zustand A)? Diese Definition gilt hier auch. Gibt es den Zähler schon im Frontend, ohne neue Abfrage?
3. **`access_phase`:** Wo liefert der Server den Wert (U4: `pre-session-briefing` oder Profil-Endpunkt)? Wie heißt der Hook oder Kontext im Frontend?
4. **Reihenfolge beim Start:** Welche Sperren laufen vor Heute (MFA-Gate `mfaGate`, Re-Consent-Sheet `checkConsent()`, Update-Banner)? Der Rundgang darf erst danach erscheinen.
5. **Profil:** Datei `ProfileScreen`, Stand der Gliederung aus Paket K 4.4 (gibt es „Dein Begleiter“ schon?).
6. **Schutz-Trigger** auf `profiles` (Migration 024): Name der Trigger-Funktion, Liste der gesperrten bzw. erlaubten Spalten. Nächste freie Migrationsnummer.
7. **Icons und Tab-Leiste:** Welche Icon-Komponenten nutzt `BottomNav` (Heute/Gespräch/Spiegel)? Die Rundgang-Grafiken verwenden dieselben.
8. **Bestehende Sheets/Modals:** Gibt es eine Vollbild- oder Sheet-Komponente mit Fokusfalle (z. B. aus Paket K oder P)? Wiederverwenden statt neu bauen.
9. **Frontend-Logger:** Funktionsnamen für Info- und Fehler-Codes.
10. **Tests:** Wo liegen die Unit-Tests für `todayState.js`, und wie laufen sie (`npm test`?)

---

### ⛔ STOPP J-R1 (vor dem Bauen, Jerome)

> 👤 **Jerome:**
> 1. R-5 bestätigen (Speicherung am Konto per RPC).
> 2. Texte in Abschnitt 5 freigeben oder ändern.

---

## 3. Datenbank

### 3.1 Migration `0xx_tour_dismissed.sql` (Nummer aus Phase 0, Punkt 6)

```sql
-- Einstiegs-Rundgang: dauerhaft ausgeblendet ab diesem Zeitpunkt
alter table public.profiles
  add column if not exists tour_dismissed_at timestamptz;

-- Schmale RPC: setzt ausschließlich tour_dismissed_at für den aufrufenden Nutzer.
-- Der Schutz-Trigger (Migration 024) bleibt unverändert; die Funktion läuft als
-- security definer und schreibt nur diese eine Spalte.
create or replace function public.set_tour_dismissed()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  update public.profiles
     set tour_dismissed_at = coalesce(tour_dismissed_at, now())
   where id = auth.uid();
end;
$$;

revoke all on function public.set_tour_dismissed() from public, anon;
grant execute on function public.set_tour_dismissed() to authenticated;
```

**Prüfen in Phase 0:** Blockiert der Schutz-Trigger auch Updates aus einer `security definer`-Funktion (z. B. über `current_user`- oder `auth.role()`-Prüfung)? Falls ja: im Trigger **nur** `tour_dismissed_at` als erlaubte Spalte für diesen Weg ergänzen und das im Bericht begründen. Andere Spalten bleiben gesperrt.

- `tour_dismissed_at` ist kein personenbezogenes Inhaltsdatum. Es wird mit dem Konto gelöscht (Zeile in `profiles`) und gehört in den Datenexport (S-16), falls der Export alle `profiles`-Spalten ausgibt. Sonst keine Änderung am Export.
- RLS auf `profiles` bleibt unverändert. Lesen der eigenen Zeile ist bereits erlaubt.

---

## 4. Frontend

### 4.1 `src/lib/tourState.js` (neu, reine Funktion, testbar wie `todayState.js`)

```js
// Entscheidet, ob der Rundgang automatisch erscheint. Keine Seiteneffekte.
export const TOUR_MAX_CONVERSATIONS = 3;

export function shouldShowTour({
  tourDismissedAt,        // profiles.tour_dismissed_at oder null
  conversationsHeld,      // Anzahl geführter Gespräche (Definition aus Phase 0, Punkt 2)
  startedOnToday,         // erster Screen nach Login/App-Start ist '/'
  shownThisSession,       // sessionStorage-Flag (4.2)
  blockingGateOpen,       // MFA-Gate, Re-Consent o. ä. offen (Phase 0, Punkt 4)
}) {
  if (tourDismissedAt) return false;
  if (conversationsHeld >= TOUR_MAX_CONVERSATIONS) return false;
  if (!startedOnToday) return false;
  if (shownThisSession) return false;
  if (blockingGateOpen) return false;
  return true;
}
```

Die Zahl 3 hängt **nicht** an `session_limit` oder am Plan. Sie gilt auch für Tester und Begleitung.

### 4.2 `src/hooks/useWelcomeTour.js` (neu)

- Liest `tourDismissedAt` aus dem bereits geladenen Profil, `conversationsHeld` aus den Heute-Daten (keine zusätzliche Abfrage, falls Phase 0 den Wert schon hat).
- **`startedOnToday`:** Merkt sich beim ersten Rendern der App-Shell nach dem Login die Startroute (Modul-Variable). Nur wenn sie `/` ist, gilt `true`. Wer über Deep Link, „Daran weiterarbeiten“ oder ein laufendes Gespräch einsteigt, sieht den Rundgang in dieser Sitzung nicht.
- **Sitzung:** Schlüssel `fs_tour_session_v1` in `sessionStorage`, gesetzt, sobald der Rundgang erscheint. Lesen und Schreiben in `try/catch`. Ohne Storage gilt ersatzweise eine Modul-Variable (dann pro Laden einmal).
- Liefert `{ open, close({ dismiss }), openManual() }`.
- `close({ dismiss: true })`: ruft `supabase.rpc('set_tour_dismissed')`, aktualisiert das Profil im lokalen Zustand optimistisch. Bei Fehler: `logClientError('tour_dismiss_failed')`, Rundgang trotzdem schließen, **keine** Fehlermeldung (beim nächsten Start kommt er dann noch einmal, das ist harmlos).

### 4.3 `src/components/tour/WelcomeTour.jsx` (neu)

Props: `mode: 'auto' | 'manual'`, `onClose({ dismiss })`, `showKennenlernenNote: boolean`.

- **Darstellung:** Vollbild-Overlay über der App-Shell, Hintergrund `--color-bg`, Aufbau wie im Design: Kopfzeile (Zurück ab Schritt 2 · Punkte · Überspringen), Grafikfläche (`--color-accent-light`, Radius 20, Höhe ca. 300 px auf dem Handy), Text, Fußzeile mit Trennlinie.
- **Fußzeile:**
  - `mode === 'auto'`: Checkbox „Nicht mehr anzeigen“ (echtes `<input type="checkbox">` mit `<label>`, `accent-color` Waldgrün, nicht vorausgewählt) + Knopf „Weiter →“, auf Schritt 5 „Los geht's“.
  - `mode === 'manual'`: keine Checkbox, Knopf „Weiter →“, auf Schritt 5 „Fertig“. „Überspringen“ heißt „Schließen“.
- **Der Haken-Zustand** gilt für den ganzen Rundgang (ein State, nicht pro Schritt) und bleibt beim Vor- und Zurückblättern erhalten.
- **Schließen-Wege:** „Los geht's“/„Fertig“, „Überspringen“/„Schließen“, Esc-Taste. Alle rufen `onClose({ dismiss: checked })`. Im Modus `manual` ist `dismiss` immer `false`.
- **Barrierefreiheit:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby` auf die Überschrift des aktuellen Schritts. Fokusfalle innerhalb des Overlays (bestehende Komponente aus Phase 0, Punkt 8, sonst minimal selbst). Beim Schrittwechsel Fokus auf die Überschrift. Punkte als `role="img"` mit `aria-label="Schritt 2 von 5"`. Alle Bedienelemente ≥ 44 px.
- **Bewegung:** sanfter Übergang zwischen Schritten (Opacity, 150 ms). Bei `prefers-reduced-motion: reduce` kein Übergang. Wischgesten sind **nicht** Teil dieses Pakets.
- **Körper-Scroll** der App ist gesperrt, solange der Rundgang offen ist. Auf kleinen Displays scrollt der Textbereich innerhalb des Overlays.

### 4.4 Grafiken `src/components/tour/illustrations/*.jsx` (neu)

Je Schritt eine kleine Komponente, nachgebaut nach dem Design-Canvas. Feste Beispieltexte aus `welcomeTour.js` (4.5), **keine** Props mit echten Daten.

| Schritt | Grafik |
|---|---|
| 1 Willkommen | Wortmarke „Friedensstifter“, drei runde Knoten Heute · Gespräch · Spiegel, verbunden durch feine Linien, Zeile darunter |
| 2 Heute | Mini-Heute: Gruß, „Was bewegt *heute?*“, JH-Avatar, Karte Tagesimpuls, verdeckte Karte mit Schloss, Tab-Leiste mit **Heute** hervorgehoben |
| 3 Gespräch | drei Chat-Blasen, Eingabezeile mit Mikrofon, Tab-Leiste mit **Gespräch** hervorgehoben |
| 4 Spiegel | Segment-Umschalter Erkenntnisse · Muster · Entwicklung, zwei Erkenntnis-Karten (eine mit ✦), Tab-Leiste mit **Spiegel** hervorgehoben |
| 5 Kreislauf | 2×2-Raster Ankommen → Sprechen ↓ Erkennen → Ausprobieren ↑, Zeile darunter |

- Die Mini-Tab-Leiste nutzt dieselben Icons wie `BottomNav` (Phase 0, Punkt 7), damit der Wiedererkennungseffekt stimmt.
- Grafiken sind dekorativ: `aria-hidden="true"` auf dem Container. Der Inhalt steht vollständig im Text daneben.

### 4.5 `src/content/welcomeTour.js` (neu, Texte zentral, Jerome kann sie ändern)

Texte siehe Abschnitt 5, als Array `TOUR_STEPS` mit `{ id, eyebrow, title, titleEmphasis, body, bullets }`. Der Kennenlern-Satz ist ein eigenes Feld `kennenlernenNote` auf Schritt 5.

### 4.6 Einbau

- **Heute:** `useWelcomeTour` in der Heute-Komponente (oder App-Shell, Phase 0) auswerten. Ist `open`, `WelcomeTour mode="auto"` rendern. `showKennenlernenNote = accessPhase === 'kennenlernen'`.
- **Profil:** In „Dein Begleiter“ direkt nach „Wie es funktioniert“ der Eintrag:
  ```
  🧭  Rundgang durch die App
      Die fünf Einstiegs-Screens noch mal ansehen        ›
  ```
  (Kompass-Icon aus dem bestehenden Icon-Set oder als Inline-SVG; im Design zur Orientierung hervorgehoben, in der App normal wie die anderen Einträge.) Öffnet `WelcomeTour mode="manual"`, nach dem Schließen ist man zurück im Profil. Gibt es die Gliederung aus Paket K noch nicht, den Eintrag unter „Wie es funktioniert“ einfügen.
- **„Wie es funktioniert“:** ganz unten ein Link „Rundgang durch die App ansehen ›“ (öffnet ebenfalls `mode="manual"`).
- Der Rundgang verändert **nichts** an Heute-Zuständen, `surfaced_at` o. ä. Er ist reine Orientierung.

### 4.7 Logs

```
tour_shown        { mode: 'auto' | 'manual' }
tour_completed    { mode }                       // Schritt 5 mit „Los geht's“/„Fertig“
tour_skipped      { mode, step: 1–5 }            // Überspringen/Schließen/Esc
tour_dismissed    { via: 'checkbox' }            // RPC erfolgreich
tour_dismiss_failed                              // Fehler-Code
```

`_shared/monitorRules.ts`:

```ts
{ id: 'tour_usage', codes: ['tour_shown', 'tour_completed', 'tour_skipped', 'tour_dismissed'], windowMin: 10080, threshold: 0, infoOnly: true },
{ id: 'tour_error', codes: ['tour_dismiss_failed'], windowMin: 1440, threshold: 10 },
```

So sieht Jerome, ob Leute den Rundgang zu Ende gehen oder an welcher Stelle sie aussteigen. Keine Inhalte, keine Nutzer-IDs in den Event-Daten.

---

## 5. Texte (Freigabe durch Jerome in J-R1)

**Schritt 1 · Willkommen** (Eyebrow „Kurzer Rundgang“)
Titel: Schön, dass du *da bist.*
> Hier findest du einen Begleiter, der dir zuhört und Fragen stellt. Ratschläge gibt er dir keine – die Antworten findest du selbst.
>
> In vier kurzen Schritten siehst du, wo du was findest. Dauert etwa eine Minute.

Grafik-Zeile: „Drei Bereiche. Mehr braucht es nicht.“

**Schritt 2 · Heute** (Eyebrow „Schritt 2 von 5“)
Titel: Heute – *dein Startpunkt*
> Hier startest du. Heute zeigt dir immer nur das, was gerade dran ist.
- Ein Impuls für den Tag, wenn du nicht weißt, womit du anfangen sollst.
- Ein Satz aus deinem letzten Gespräch. Verdeckt, bis du ihn antippst.
- „Wie geht's dir?“ – wenn du erst mal ankommen magst.

**Schritt 3 · Gespräch** (Eyebrow „Schritt 3 von 5“)
Titel: Gespräch – *dein Begleiter*
> Hier sprichst du mit deinem Begleiter über das, was dich bewegt. Tippen oder sprechen, wie es dir lieber ist.
- Etwas Neues mitbringen oder ein früheres Gespräch weiterführen.
- Am Ende fragt er dich: Was nimmst du heute mit?
- Du bestimmst Thema und Tempo. Pausieren geht jederzeit.

*Hinweis:* „oder sprechen“ nur, wenn die Spracheingabe (Paket Spracheingabe) live ist. Sonst: „Hier schreibst du mit deinem Begleiter über das, was dich bewegt.“ Steuerung über die bestehende Feature-Konstante der Spracheingabe.

**Schritt 4 · Spiegel** (Eyebrow „Schritt 4 von 5“)
Titel: Spiegel – *was du erkennst*
> Was du in Gesprächen erkennst, sammelt sich hier, damit es nicht verloren geht.
- **Erkenntnisse** – deine Sätze, in deinen Worten
- **Muster** – was sich bei dir wiederholt
- **Entwicklung** – wie du dich mit der Zeit bewegst

> Die App bewertet nichts. Wenn dich etwas weitergebracht hat, markierst du es selbst mit ✦.

*Hinweis:* Der ✦-Satz nur, wenn U5a (Deine Einschätzung) live ist. Sonst entfällt er.

**Schritt 5 · Kreislauf** (Eyebrow „Schritt 5 von 5“)
Titel: Ein Kreislauf, *kein Programm.*
Grafik: Ankommen → Sprechen → Erkennen → Ausprobieren, Zeile „Im Alltag ausprobieren – und wiederkommen, wann du magst.“
> Du kannst überall einsteigen und jederzeit pausieren. Nichts läuft dir davon.

Karte mit JH-Avatar:
> Oben rechts findest du dein Profil: Konto, Sicherheit – und diesen Rundgang, falls du ihn noch mal sehen willst.

Nur bei `access_phase = 'kennenlernen'` (R-3):
> Zum Kennenlernen hast du drei Gespräche. Was du dabei erkennst, bleibt dir danach so oder so.

*Hinweis:* „Oben rechts“ gilt, solange das Profil über den Avatar erreicht wird (Kreislauf U1). Die Zahl „drei“ kommt aus `coalesce(session_limit, 3)`, falls Phase 0 einen anderen Wert für den Nutzer findet, wird sie eingesetzt.

Sprachprinzip 1.5 geprüft: kein „müssen“, kein absolutes „immer/nie“ als Forderung, keine Coaching-Vokabeln.

---

## 6. Tests

### 6.1 Unit-Tests `tourState.test.js`

| Fall | Erwartung |
|---|---|
| neu, 0 Gespräche, Start auf Heute, nicht gezeigt, kein Gate | `true` |
| `tourDismissedAt` gesetzt | `false` |
| 3 geführte Gespräche, kein Haken | `false` |
| 2 geführte Gespräche | `true` |
| Start auf `/coach` (Deep Link) | `false` |
| in dieser Sitzung schon gezeigt | `false` |
| MFA-Gate oder Re-Consent offen | `false` |

### 6.2 `attack-test.mjs` (nächste freie Nummern)

| # | Prüfung | Erwartung |
|---|---|---|
| R1 | `rpc/set_tour_dismissed` ohne Token (anon) | 401/403 |
| R2 | `rpc/set_tour_dismissed` mit Token von Nutzer A | 204/200, nur Zeile von A hat `tour_dismissed_at` |
| R3 | direkter `PATCH /profiles` mit `tour_dismissed_at` und einer gesperrten Spalte (z. B. `plan`) | Schutz-Trigger greift wie bisher, `plan` unverändert |
| R4 | zweiter Aufruf der RPC | Zeitstempel bleibt der erste (`coalesce`) |

---

### ⛔ STOPP J-R2: Test auf dem Gerät

> 👤 **Jerome:** Mergen, Deploy abwarten, dann mit einem **neuen Testkonto** (ohne Einladungscode) auf dem Handy:
> 1. Nach dem ersten Login erscheint der Rundgang auf Heute. Schritt 5 zeigt den Kennenlern-Satz.
> 2. „Überspringen“ ohne Haken → App ganz schließen und neu öffnen → Rundgang kommt wieder.
> 3. Zwischen den Tabs wechseln → Rundgang kommt **nicht** erneut.
> 4. Auf Schritt 3 Haken setzen, dann „Überspringen“ → App neu öffnen → kein Rundgang. Auf einem zweiten Gerät (oder Desktop) einloggen → auch dort kein Rundgang.
> 5. Zweites Testkonto ohne Haken: drei Gespräche mit je ≥ 3 Nachrichten führen → App neu öffnen → kein Rundgang mehr.
> 6. Profil → „Rundgang durch die App“ → Rundgang ohne Haken, letzter Knopf „Fertig“, danach zurück im Profil.
> 7. Mit Tester-Konto: Schritt 5 **ohne** Kennenlern-Satz.
> 8. App über einen Link „Daran weiterarbeiten“ bzw. direkt in ein laufendes Gespräch öffnen → kein Rundgang darüber.
> 9. VoiceOver (iPhone) kurz: Schritt wird angesagt, Checkbox und Knöpfe sind erreichbar, Esc/Zurück-Geste schließt.
> 10. Supabase: `app_logs` zeigt `tour_shown`, `tour_skipped`, `tour_dismissed` ohne Inhalte.

---

## 7. Abschluss

1. `npm test` (inkl. `tourState.test.js`), `npm run build`, `npm run security:test` alle PASS.
2. `ARCHITECTURE.md`: Abschn. 2 (neue Dateien), Abschn. 4 (Rundgang, Profil-Eintrag), Datenmodell (`profiles.tour_dismissed_at`, RPC `set_tour_dismissed`).
3. Kreislauf-Konzept: In Abschnitt 7 („Was gleich bleibt“) beim nächsten Update ergänzen, dass es nach dem Login einen Rundgang gibt.
4. Abschlussbericht `docs/rundgang/paket-r-abschlussbericht.md` **und** im Chat: Status, Phase-0-Befunde (v. a. Schutz-Trigger, Definition „geführtes Gespräch“), geänderte Dateien, Testergebnisse, offene Fragen.

### ⛔ STOPP J-R3: Abnahme

> 👤 **Jerome:** Gerätetest J-R2 vollständig, Tests PASS, Texte final, Abschlussbericht gelesen.

---

## 8. Definition of Done

- [ ] Neue Nutzer sehen nach dem Login auf Heute einen Rundgang in fünf Schritten, mit Grafiken nach dem Design-Canvas.
- [ ] Der Rundgang kommt pro App-Start höchstens einmal, nicht bei Tab-Wechsel, nicht über Deep Links und nicht vor MFA/Re-Consent.
- [ ] „Nicht mehr anzeigen“ wirkt dauerhaft und geräteübergreifend (`profiles.tour_dismissed_at` über RPC). Der Schutz-Trigger ist nicht aufgeweicht.
- [ ] Nach 3 geführten Gesprächen kommt der Rundgang nicht mehr, auch ohne Haken.
- [ ] Der Kennenlern-Satz erscheint nur im Kennenlernen.
- [ ] Profil → „Rundgang durch die App“ und der Link in „Wie es funktioniert“ öffnen den Rundgang jederzeit (ohne Haken, „Fertig“).
- [ ] Barrierefrei: Dialog-Rolle, Fokusfalle, Esc, ≥ 44 px, reduzierte Bewegung respektiert.
- [ ] Keine echten Nutzerdaten im Rundgang. Logs nur als `tour_*`-Codes.
- [ ] Unit-Tests und Angriffstests PASS, `ARCHITECTURE.md` und Abschlussbericht aktualisiert.

---

*Handoff Einstiegs-Rundgang v1 · erstellt mit Claude für Jerome Houboi · friedensstifter.coach*
