# Handoff: T1 Buch-Seite („Das Buch zur App“)

> **Für:** Claude Code · **Von:** Jerome (vorbereitet mit Claude) · **Stand:** 21.11.2026 · **Version:** v1
> **Grundlage:** „T1 Buch-Seite – Bestandsaufnahme für das Handoff“ (Claude Code, 21.11.2026, `main` nach A0 `0689f8e3`), `claude/friedensstifter-konzept-buch-bezuege-v1.md` v1.1 (Abschnitte 1–2), `claude/friedensstifter-buch-landkarte-v1.md` (Aufbau des Buchs), `claude/handoff-reihenfolge-offene-pakete.md` (Regeln 1–3)
> **Ziel:** Bis zum Erscheinen des Taschenbuchs am **27.11.2026** gibt es in der App eine Seite `/buch`. Sie stellt das Buch vor und verlinkt zu Amazon. Dort gibt der Nutzer an, ob er das Buch kennt und bis wohin er gelesen hat. Die Seite ist über das Profil, „Wie es funktioniert“ und einen dezenten Link auf Heute erreichbar. Der Buch-Status wird am Konto gespeichert. Er wirkt erst mit B1 (Buch-Bezüge im Gespräch), wird aber jetzt schon erfasst.

**Abgrenzung:** T1 ändert **nichts** am Gespräch, an Prompts, an Edge Functions oder am Spiegel. Das kommt mit B1. Die einmalige Frage auf Heute nach dem ersten Gespräch und die Lesestand-Erinnerung sind **nicht** Teil von T1 (siehe Abschnitt 9).

---

## Entscheidungen

| # | Frage | Entscheidung |
|---|---|---|
| T1-1 | Umfang | Buch-Seite `/buch`, Profil-Karte, Block in „Wie es funktioniert“, dezenter Link auf Heute (Zustand A). **Nicht** in T1: einmalige Frage nach dem ersten Gespräch, monatliche Lesestand-Karte, beides verschoben nach B1 ✅ 21.11. |
| T1-2 | Status speichern | RPC `set_book_status` nach dem Muster von `set_learning_opt_in`. Die drei `book_*`-Spalten kommen auf die Sperrliste des Schutz-Triggers. Kein direktes `update profiles` aus dem Frontend ✅ 21.11. |
| T1-3 | Lesestand | Auswahl **Teil 1 bis Teil 7**. „Durch“ ist der Status `read`, kein Lesestand. `book_progress` 1–7 (nicht 1–8). Für B1 gilt: Position 0 (Vorweg) sehen alle Leser, Position 6 schließt „Davor und danach“ ein, Position 8 (Epilog) nur bei `read`. „Ich lese gerade“ ohne gewählten Teil wird **nicht** gespeichert ✅ 21.11. |
| T1-4 | Route und Rahmen | `/buch` liegt in der Haupt-Gruppe hinter Login (`ProtectedRoute`, `App.jsx` Z. 178 ff.), **nicht** öffentlich. In `AppShell` ohne aktiven Tab (wie `/profile`), zusätzlich Zurück-Pfeil in der Kopfzeile ✅ 21.11. |
| T1-5 | Cover | Datei `public/buch-cover.webp` (600 × 929 px, ca. 115 KB, liegt diesem Handoff bei). Keine Bild-URL von Amazon ✅ 21.11. |
| T1-6 | Ehrlichkeit, solange B1 fehlt | Der freigegebene Seitentext beschreibt die Buch-Bezüge im Gespräch. Bis B1 live ist, steht unter der Status-Auswahl ein kurzer Hinweis, dass diese Bezüge noch kommen. Gesteuert über `BOOK_REFERENCES_LIVE = false` (Vorschlag, Jerome bestätigt in J-T1) |
| T1-7 | Status im Profil ändern | Die Profil-Karte zeigt den Status und verlinkt mit „ändern“ direkt auf den Status-Abschnitt der Buch-Seite (`/buch#buch-status`). Die Auswahl gibt es damit nur an einer Stelle (Vorschlag, Jerome bestätigt in J-T1) |
| T1-8 | Bedeutung des Lesestands | „Bis wohin bist du gekommen?“ meint den **Teil, in dem der Nutzer gerade ist**. Wie B1 damit umgeht (z. B. 🔒-Auflösungen erst ab dem Folgeteil), entscheidet das Handoff B1 (Vorschlag, Jerome bestätigt in J-T1) |
| T1-9 | Klicks auf die Amazon-Links | Ein interner Log-Code `book_link_clicked` ohne Nutzer-ID, damit Jerome sieht, ob die Seite genutzt wird. Kein Pixel, kein Affiliate-Parameter (Vorschlag, Jerome bestätigt oder streicht in J-T1) |

---

## 0. Spielregeln für Claude Code

Alle Regeln aus `CLAUDE.md`, den Paketen A–C, K, P, Z und aus `handoff-reihenfolge-offene-pakete.md` gelten weiter. Besonders wichtig hier:

1. **Branch** `feature/t1-buch-seite` von aktuellem `main`.
2. **Migration:** nächste freie Nummer zum Startzeitpunkt (laut Bestandsaufnahme **043**). Jede Migration bekommt einen Kommentar zum Rückgängigmachen.
3. **Schutz-Trigger nur erweitern, nie aufweichen.** Die Funktion aus `040_k_consent_v2.sql` wird vollständig übernommen, **nur** die drei `book_*`-Spalten kommen dazu. Der Diff kommt in den Abschlussbericht.
4. **Texte:** Der Seitentext (Abschnitt 5.1) ist freigegeben und wird **wörtlich** übernommen. Alle weiteren Texte stehen in Abschnitt 5.2 und gelten erst nach Jeromes Freigabe in J-T1. Claude Code schreibt keine eigenen Inhaltstexte.
5. **Keine stillen Fehler.** „Gespeichert“ erscheint erst nach erfolgreicher RPC. Bei Fehlern sieht der Nutzer eine Meldung, die Auswahl springt auf den gespeicherten Stand zurück. Logs nur mit Codes (`book_*`), nie mit Inhalten.
6. **Keine neuen Pakete.** Reines React mit bestehenden Styles und Komponenten.
7. **Kein Tracking.** Amazon-Links ohne Affiliate-Parameter, ohne Pixel, `target="_blank" rel="noopener noreferrer"`.
8. **Nichts am Gespräch.** Keine Änderung an `chat`, `post-conversation`, `pre-session-briefing`, `HOWTO_SYSTEM_PROMPT` oder anderen Prompts (B-4: kein Buch im Chat).
9. **Paket R (Einstiegs-Rundgang):** fasst ebenfalls `ProfileScreen.jsx` und `HowItWorksScreen.jsx` an und braucht eine Migration. Nicht parallel bauen. Was zuerst gemergt ist, gilt als Stand. Das andere Paket setzt darauf auf.
10. **Keine Deploys.** An jedem **⛔ STOPP** an Jerome übergeben.

---

## 1. Was der Nutzer erlebt

```
Profil ──────────── Karte „Das Buch zur App“ ──── Mehr zum Buch → ──┐
                         └─ Status-Zeile · ändern ─► /buch#buch-status
Wie es funktioniert ─ Block „Das Buch zur App“ ── Mehr zum Buch → ──┤
Heute (Zustand A) ── unter „So funktioniert's“: Zur App gibt es ──────┤
                     auch ein Buch →                                  ▼
                                                                    /buch
  ←  Das Buch zur App
  [Cover]
  Friedensstifter · Untertitel · Klappentext
  WAS DAS MIT DIESER APP ZU TUN HAT · Text · Zitat aus dem Epilog
  [ Als E-Book (Kindle) → ]   [ Als Taschenbuch · erscheint am 27.11. ]
  Die Links führen zu Amazon.

  KENNST DU DAS BUCH SCHON?                          (id="buch-status")
   ( ) Ja, durchgelesen          → speichert sofort read
   ( ) Ich lese gerade           → zeigt „Bis wohin bist du gekommen?“
         ( ) Teil 1 · Was hast du gehört?            → speichert reading + Teil
         …
         ( ) Teil 7 · Schon wieder
   ( ) Noch nicht                → speichert sofort not_yet
   „Gespeichert“ / Fehlermeldung
   Hinweis (solange BOOK_REFERENCES_LIVE = false)

  (JH)  Jerome Houboi · Systemischer Coach
```

---

## 2. Phase 0: Restfragen zur Bestandsaufnahme

Die Bestandsaufnahme vom 21.11. gilt. Offen sind nur noch diese Punkte. Antworten mit Pfad und Zeile in `docs/buch/t1-phase0.md`.

1. **Wie umgeht `set_learning_opt_in` den Schutz-Trigger?** `learning_opt_in*` steht auf der Sperrliste, die RPC schreibt die Spalte trotzdem. Welcher Mechanismus erlaubt das (z. B. `current_user`-Prüfung im Trigger, `set_config(...)` als Freigabe-Flag, Rolle des Funktionsbesitzers)? `set_book_status` nutzt **genau denselben** Mechanismus.
2. **Verhalten des Triggers bei gesperrten Spalten:** Wirft er einen Fehler oder setzt er still auf `OLD` zurück? Das bestimmt die Erwartung im Angriffstest T1-d.
3. **Profil im Frontend:** Wo wird das Profil geladen (Hook oder Kontext)? Mit `select('*')` oder mit fester Spaltenliste? Bei fester Liste kommen `book_status` und `book_progress` dazu. Wie wird der lokale Profil-Zustand nach einer Änderung aktualisiert (Beispiel: `set_learning_opt_in` im Frontend)?
4. **`mfa_satisfied()`:** genaue Signatur und Fehlercode, den `set_learning_opt_in` wirft. Wie behandelt das Frontend diesen Code dort?
5. **Bestehende Bausteine:** Radio-Gruppe oder Auswahlliste (z. B. aus Profil, Wellness oder Paket K), Kopfzeile mit Zurück-Pfeil (z. B. `/begleitung`), Karten-Stil im Profil, `Avatar` mit „JH“. Wiederverwenden statt neu bauen.
6. **Feature-Konstanten:** Wo liegen sie (z. B. die Konstante der Spracheingabe)? `BOOK_REFERENCES_LIVE` kommt dorthin.
7. **Logger und Monitor:** Funktionsnamen für Info- und Fehler-Codes im Frontend, Ort von `_shared/monitorRules.ts`.
8. **Service Worker (Paket P):** Werden Dateien aus `public/` vorab gecacht (Glob)? Falls ja: Prüfen, dass `buch-cover.webp` den Build nicht bricht. Eine Aufnahme in den Precache ist nicht nötig.
9. **„Wie es funktioniert“:** Gibt es schon den Link zum Rundgang (Paket R) ganz unten? Der Buch-Block steht direkt nach „Was steckt dahinter?“ (Z. 208) und, falls vorhanden, **vor** dem Rundgang-Link.
10. **Tests:** Wo liegen Unit-Tests (z. B. zu `todayState.js`) und wie werden sie gestartet?

---

### ⛔ STOPP J-T1 (vor dem Bauen, Jerome)

> 👤 **Jerome:**
> 1. T1-6 bis T1-9 bestätigen oder ändern.
> 2. Texte in Abschnitt 5.2 freigeben oder ändern.
> 3. `buch-cover.webp` in `public/` des Repos legen (oder Claude Code die Datei geben).

---

## 3. Datenbank

### 3.1 Migration `043_t1_book_status.sql` (Nummer aus Phase 0)

```sql
-- T1 Buch-Seite: Buch-Status am Profil
--
-- Rückgängig machen:
--   drop function if exists public.set_book_status(text, int);
--   -- Schutz-Trigger-Funktion auf den Stand aus 040_k_consent_v2.sql zurücksetzen
--   alter table public.profiles
--     drop constraint if exists profiles_book_progress_consistent,
--     drop constraint if exists profiles_book_progress_check,
--     drop constraint if exists profiles_book_status_check,
--     drop column if exists book_status_at,
--     drop column if exists book_progress,
--     drop column if exists book_status;

alter table public.profiles
  add column if not exists book_status    text,
  add column if not exists book_progress  int,
  add column if not exists book_status_at timestamptz;

alter table public.profiles
  add constraint profiles_book_status_check
    check (book_status is null or book_status in ('read', 'reading', 'not_yet')),
  add constraint profiles_book_progress_check
    check (book_progress is null or book_progress between 1 and 7),
  -- Lesestand gibt es genau dann, wenn der Status 'reading' ist
  add constraint profiles_book_progress_consistent
    check (
      (book_status = 'reading' and book_progress is not null)
      or (book_status is distinct from 'reading' and book_progress is null)
    );

comment on column public.profiles.book_status is
  'Selbstauskunft zum Buch "Friedensstifter": read | reading | not_yet; null = nie angegeben (wie not_yet behandeln)';
comment on column public.profiles.book_progress is
  'Nur bei reading: Teil 1-7, in dem der Nutzer gerade ist (T1-8)';
comment on column public.profiles.book_status_at is
  'Zeitpunkt der letzten Änderung von book_status/book_progress';
```

### 3.2 RPC `set_book_status` (in derselben Migration)

Aufbau wie `set_learning_opt_in` (032 → 037 → 041): `SECURITY DEFINER`, `search_path = ''`, **zuerst** `public.mfa_satisfied()`, nur `authenticated`. Die Freigabe für den Schutz-Trigger (Phase 0, Punkt 1) genau so wie dort.

```sql
create or replace function public.set_book_status(p_status text, p_progress int default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if not public.mfa_satisfied() then
    raise exception 'mfa_required' using errcode = '42501';   -- Code wie in set_learning_opt_in (Phase 0, Punkt 4)
  end if;

  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_status is null or p_status not in ('read', 'reading', 'not_yet') then
    raise exception 'invalid_book_status' using errcode = '22023';
  end if;

  if p_status = 'reading' then
    if p_progress is null or p_progress < 1 or p_progress > 7 then
      raise exception 'invalid_book_progress' using errcode = '22023';
    end if;
  elsif p_progress is not null then
    raise exception 'invalid_book_progress' using errcode = '22023';
  end if;

  -- [Freigabe für trg_protect_profile_privileges wie in set_learning_opt_in]

  update public.profiles
     set book_status    = p_status,
         book_progress  = case when p_status = 'reading' then p_progress end,
         book_status_at = now()
   where id = v_uid;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_book_status(text, int) from public, anon;
grant execute on function public.set_book_status(text, int) to authenticated;
```

### 3.3 Schutz-Trigger erweitern (in derselben Migration)

`trg_protect_profile_privileges` bzw. seine Funktion aus `040_k_consent_v2.sql` **vollständig** übernehmen und die Sperrliste um `book_status`, `book_progress`, `book_status_at` ergänzen. Sonst nichts ändern. Im Abschlussbericht den Diff gegen 040 zeigen.

### 3.4 Was sich nicht ändert

- **RLS auf `profiles`:** unverändert. Die eigene Zeile lesen ist schon erlaubt.
- **Export (`export-my-data`):** gibt `profiles` vollständig aus, die neuen Spalten sind automatisch dabei. Keine Codeänderung, nur im Test prüfen (J-T2, Punkt 9).
- **Löschen:** läuft per CASCADE mit `profiles`. Keine Änderung.
- **Datenschutz:** Der Buch-Status ist eine harmlose Selbstauskunft ohne Gesundheitsbezug. Keine Änderung an Rechtstexten nötig.

---

## 4. Frontend

### 4.1 Cover

- Datei: `public/buch-cover.webp`, 600 × 929 px.
- Einbindung immer mit `width`/`height` (gegen Layout-Sprünge), auf der Buch-Seite `loading="eager"`, im Profil `loading="lazy"`, `decoding="async"`.
- `alt`: „Buchcover von Friedensstifter: zwei Menschen von hinten auf einem Feldweg im Abendlicht“.
- Darstellung: leichter Schatten, Radius 4 px, auf der Buch-Seite zentriert, max. 220 px breit.

### 4.2 `src/content/book.js` (neu, alle Texte und Links zentral)

```js
// Alle Texte zum Buch an einer Stelle. Jerome kann sie hier ändern.
export const BOOK = {
  title: 'Friedensstifter',
  subtitle: 'Zwei Nachbarn, ein Feldweg und sieben Gespräche',
  author: 'Jerome Houboi',
  ebookUrl: 'https://www.amazon.de/dp/B0HRZWBH1F',
  paperbackUrl: null,              // Nachtrag ab 27.11. (Abschnitt 8)
  paperbackReleaseLabel: '27.11.',
  coverSrc: '/buch-cover.webp',
  coverWidth: 600,
  coverHeight: 929,
  coverAlt: 'Buchcover von Friedensstifter: zwei Menschen von hinten auf einem Feldweg im Abendlicht',
};

// Teil-Titel aus dem Buch (Buch-Landkarte, Aufbau). Reihenfolge = book_progress.
export const BOOK_PARTS = [
  { n: 1, title: 'Was hast du gehört?' },
  { n: 2, title: 'Tausend kleine Tiger' },
  { n: 3, title: 'Die Kampagne' },
  { n: 4, title: 'Wo hast du das her?' },
  { n: 5, title: 'Seh ich anders' },
  { n: 6, title: 'Tausend Beweise am Tag' },
  { n: 7, title: 'Schon wieder' },
];

export const BOOK_PAGE_TEXT = { /* Abschnitt 5.1, wörtlich */ };
export const BOOK_UI_TEXT   = { /* Abschnitt 5.2, nach Freigabe */ };
```

`BOOK_REFERENCES_LIVE` kommt zu den bestehenden Feature-Konstanten (Phase 0, Punkt 6), Wert `false`. B1 stellt ihn auf `true`.

### 4.3 `src/lib/bookStatus.js` (neu, reine Funktionen, testbar)

```js
export const BOOK_STATUSES = ['read', 'reading', 'not_yet'];
export const BOOK_PROGRESS_MAX = 7;

// Prüft eine Eingabe, bevor die RPC aufgerufen wird. Spiegelt die Regeln der RPC.
export function isValidBookStatus(status, progress) {
  if (!BOOK_STATUSES.includes(status)) return false;
  if (status === 'reading') {
    return Number.isInteger(progress) && progress >= 1 && progress <= BOOK_PROGRESS_MAX;
  }
  return progress == null;
}

// Status-Zeile für die Profil-Karte (Texte aus BOOK_UI_TEXT). null, wenn nichts angegeben.
export function bookStatusLine(status, progress, text) {
  if (status === 'read') return text.statusRead;
  if (status === 'reading' && progress) return text.statusReading.replace('{n}', String(progress));
  if (status === 'not_yet') return text.statusNotYet;
  return null;
}
```

### 4.4 `src/hooks/useBookStatus.js` (neu)

- Liest `book_status` und `book_progress` aus dem bereits geladenen Profil (Phase 0, Punkt 3).
- `save(status, progress)`:
  1. Prüft mit `isValidBookStatus`. Ungültig → kein Aufruf, `logClientError('book_status_invalid_input')`.
  2. Zustand `saving`. `supabase.rpc('set_book_status', { p_status, p_progress })`.
  3. **Erfolg:** lokales Profil aktualisieren (wie nach `set_learning_opt_in`), Zustand `saved`, `logInfo('book_status_set', { status, progress })`.
  4. **Fehler:** Zustand `error`, Auswahl auf den gespeicherten Stand zurücksetzen, `logClientError('book_status_failed', { code })`. `code` ist der Fehlername aus der RPC (`mfa_required`, `invalid_book_status` …), nie die Fehlermeldung im Klartext.
- Liefert `{ status, progress, state: 'idle' | 'saving' | 'saved' | 'error', save }`.
- **Kein optimistisches „Gespeichert“.**

### 4.5 `src/components/book/BookStatusPicker.jsx` (neu)

- Überschrift „Kennst du das Buch schon?“ als `h2` mit `id="buch-status-title"`. Der Abschnitt hat `id="buch-status"` und `tabIndex={-1}`, damit der Sprung aus dem Profil den Fokus setzen kann.
- **Erste Gruppe:** `role="radiogroup"` mit `aria-labelledby="buch-status-title"`, drei echte `<input type="radio">` mit `<label>`: „Ja, durchgelesen“ · „Ich lese gerade“ · „Noch nicht“. Ist `book_status` `null`, ist nichts gewählt.
- **Verhalten:**
  - „Ja, durchgelesen“ oder „Noch nicht“ → sofort `save('read' | 'not_yet', null)`.
  - „Ich lese gerade“ → **speichert noch nicht**, sondern zeigt die zweite Gruppe. War schon ein Lesestand gespeichert, ist er vorausgewählt (dann ist auch nichts zu speichern).
- **Zweite Gruppe** (nur sichtbar bei „Ich lese gerade“): Frage „Bis wohin bist du gekommen?“, `role="radiogroup"`, sieben Zeilen aus `BOOK_PARTS`, Beschriftung „Teil 3 · Die Kampagne“. Auswahl → `save('reading', n)`. Solange kein Teil gewählt ist, steht darunter der Hinweis „Wähle den Teil, in dem du gerade bist.“
- **Rückmeldung:** eine Zeile mit `aria-live="polite"`. Bei `saved` „Gespeichert“, nach 2,5 s ausgeblendet. Bei `error` die Fehlermeldung mit `role="alert"`, bleibt stehen, bis der Nutzer erneut wählt.
- Während `saving` sind alle Radios `disabled` (keine Doppelaufrufe).
- Darunter klein: „Du kannst das jederzeit ändern, hier oder im Profil.“ Bei `BOOK_REFERENCES_LIVE === false` zusätzlich der Hinweis aus T1-6.
- Alle Bedienelemente mindestens 44 px hoch.

### 4.6 `src/screens/book/BookScreen.jsx` (neu)

**Route** in `src/App.jsx`, Haupt-Gruppe (Z. 178 ff.), innerhalb `AppShell`:

```jsx
<Route path="/buch" element={<BookScreen />} />
```

Die BottomNav zeigt keinen aktiven Tab (wie `/profile`).

**Kopfzeile:** Zurück-Pfeil (bestehender Baustein, Phase 0, Punkt 5) und Titel „Das Buch zur App“ als `h1`. Zurück: `navigate(-1)`, wenn es einen Verlauf innerhalb der App gibt, sonst `navigate('/profile')`.

**Inhalt** in dieser Reihenfolge, alle Texte aus Abschnitt 5.1:

1. Cover (4.1)
2. Titel „Friedensstifter“ (`h2`, DM Serif Display), Untertitel kursiv darunter
3. Klappentext
4. Zwischenüberschrift „Was das mit dieser App zu tun hat“ (Eyebrow-Stil wie in den bestehenden Screens, als `h2`)
5. Absatz zur App
6. Zitat als `<blockquote>`, Quelle „– aus dem Epilog“ in einem `<cite>`, abgesetzt mit feiner Linie in Waldgrün links
7. Die zwei Sätze „Die App funktioniert auch ohne das Buch. / Mit dem Buch wird sie ein Stück reicher.“
8. **Links:**
   - „Als E-Book (Kindle) →“: Primär-Knopf, `<a href={BOOK.ebookUrl} target="_blank" rel="noopener noreferrer">`, bei Klick `logInfo('book_link_clicked', { format: 'ebook' })`.
   - Taschenbuch: Ist `paperbackUrl` gesetzt, Sekundär-Knopf „Als Taschenbuch →“ (gleiche Attribute, `format: 'paperback'`). Ist er `null`, **kein Link und kein deaktivierter Knopf**, sondern ein Text im Knopf-Umriss: „Als Taschenbuch · erscheint am 27.11.“
   - Darunter klein: „Die Links führen zu Amazon.“
9. `BookStatusPicker` (4.5)
10. Fußzeile: JH-Avatar und „Jerome Houboi · Systemischer Coach“

**Sprung zum Status:** Steht in der URL `#buch-status`, scrollt die Seite nach dem ersten Rendern zum Abschnitt und setzt den Fokus darauf. Bei `prefers-reduced-motion: reduce` ohne weiches Scrollen.

**Herkunft fürs Log:** Die Links zur Buch-Seite übergeben `state: { from: 'profile' | 'howto' | 'today' }`. Beim Öffnen `logInfo('book_page_viewed', { from: state?.from ?? 'direct' })`.

### 4.7 Profil-Karte `src/components/book/BookProfileCard.jsx` (neu)

**Ort:** `ProfileScreen.jsx` direkt **unter** der grünen Coaching-Karte (Z. 216–228), vor „Dein Begleiter“.

```
┌──────────────────────────────────────────────┐
│ ┌────┐  DAS BUCH ZUR APP                      │
│ │    │  Friedensstifter                       │
│ │cov.│  Zwei Nachbarn, ein Feldweg            │
│ │    │  und sieben Gespräche                  │
│ └────┘                                        │
│ ──────────────────────────────────────────── │
│ Du liest gerade Teil 3            ändern ›    │   (nur wenn Status gesetzt)
│ Mehr zum Buch →                              │
└──────────────────────────────────────────────┘
```

- **Optik:** bewusst **nicht** grün, damit sie nicht mit der Coaching-Karte konkurriert. Heller Karten-Stil wie die anderen Profil-Abschnitte, feiner Rahmen. Cover-Vorschau 56 × 87 px, `loading="lazy"`, `alt=""` (der Titel steht daneben).
- **Links:** zwei getrennte Links, keine verschachtelten klickbaren Flächen.
  - „Mehr zum Buch →“ → `/buch` (`state: { from: 'profile' }`)
  - „ändern ›“ → `/buch#buch-status` (`state: { from: 'profile' }`), nur wenn ein Status gesetzt ist
- **Status-Zeile:** über `bookStatusLine()`. Bei `null` entfällt die Zeile.

### 4.8 „Wie es funktioniert“

In `src/screens/howto/HowItWorksScreen.jsx` ein neuer `section` mit `h2` „Das Buch zur App“, direkt nach „Was steckt dahinter?“ (Z. 208) und vor einem eventuellen Rundgang-Link (Phase 0, Punkt 9). Text aus 5.2, abhängig von `BOOK_REFERENCES_LIVE`. Am Ende der Link „Mehr zum Buch →“ (`state: { from: 'howto' }`). Kein Cover in diesem Block.

### 4.9 Heute, Zustand A

In `src/screens/home/HomeScreen.jsx`, Zustand A (ab Z. 102), direkt unter dem Block „So funktioniert's“ ein einzelner Text-Link: „Zur App gibt es auch ein Buch →“ (`state: { from: 'today' }`).

- Dezent: Sekundär-Textfarbe, normale Schriftgröße des Fließtexts, keine Karte, kein Bild, keine Hervorhebung. Mindestens 44 px Tippfläche.
- **Nur** in Zustand A. `todayState.js` bleibt unverändert.

### 4.10 Logs

```
book_page_viewed          { from: 'profile' | 'howto' | 'today' | 'direct' }
book_link_clicked         { format: 'ebook' | 'paperback' }    // T1-9
book_status_set           { status, progress }                 // progress nur bei reading
book_status_failed        { code }                             // Fehler-Code
book_status_invalid_input                                      // Fehler-Code, sollte nie vorkommen
```

`_shared/monitorRules.ts`:

```ts
{ id: 'book_usage', codes: ['book_page_viewed', 'book_link_clicked', 'book_status_set'], windowMin: 10080, threshold: 0, infoOnly: true },
{ id: 'book_error', codes: ['book_status_failed', 'book_status_invalid_input'], windowMin: 1440, threshold: 5 },
```

Keine Nutzer-IDs und keine Inhalte in den Event-Daten.

---

## 5. Texte

### 5.1 Seitentext (B-7, am 21.11.2026 freigegeben, wörtlich übernehmen)

**Kopfzeile:** Das Buch zur App

**Titel:** Friedensstifter
**Untertitel:** Zwei Nachbarn, ein Feldweg und sieben Gespräche

**Klappentext:**
> Tim hat schlechte Laune, und er weiß genau, warum: Sein Chef ist schuld. Mara wohnt zwei Häuser weiter, geht jeden Abend dieselbe Runde und stellt Fragen. Sieben Gespräche auf dem Feldweg, vom Herbst bis in den April. Nach jedem steige ich aus der Geschichte aus und erkläre, was dahintersteckt. Und ich erzähle, wo mir die Themen selbst begegnet sind.

**Zwischenüberschrift:** Was das mit dieser App zu tun hat

> Am Ende jedes Teils stehen im Buch ein paar Fragen an dich. Hier in der App kannst du weiterfragen lassen: Dein Begleiter stellt Fragen, so wie Mara. Wenn du das Buch kennst, erinnert er dich ab und zu an eine Szene zwischen Tim und Mara, die gerade passt, oder an etwas, das ich im Buch erzähle. Manchmal sieht man ein Muster bei Tim schneller als bei sich selbst. Und dann denkst du: Moment, das kenne ich.

**Zitat:** „Ein guter Coach weiß das am Anfang auch nicht. Aber er kann fragen.“ – aus dem Epilog

> Die App funktioniert auch ohne das Buch.
> Mit dem Buch wird sie ein Stück reicher.

**Knöpfe:** Als E-Book (Kindle) → · Als Taschenbuch → (bis zum Link: „Als Taschenbuch · erscheint am 27.11.“)

**Status:** Kennst du das Buch schon? · Ja, durchgelesen · Ich lese gerade · Noch nicht

**Fußzeile:** Jerome Houboi · Systemischer Coach

### 5.2 Neue Texte (Freigabe durch Jerome in J-T1)

**Buch-Seite, ergänzend**

| Stelle | Text |
|---|---|
| Unter den Knöpfen | Die Links führen zu Amazon. |
| Frage zum Lesestand | Bis wohin bist du gekommen? |
| Teile | Teil 1 · Was hast du gehört? … Teil 7 · Schon wieder (aus `BOOK_PARTS`) |
| Solange kein Teil gewählt | Wähle den Teil, in dem du gerade bist. |
| Nach dem Speichern | Gespeichert |
| Fehler | Das hat nicht geklappt. Versuch es bitte noch einmal. |
| Unter der Auswahl | Du kannst das jederzeit ändern, hier oder im Profil. |
| Hinweis T1-6 (nur bei `BOOK_REFERENCES_LIVE = false`) | Die Erinnerungen an Szenen aus dem Buch kommen in den nächsten Wochen dazu. Was du hier angibst, gilt dann schon. |

**Profil-Karte**

| Stelle | Text |
|---|---|
| Eyebrow | Das Buch zur App |
| Titel / Untertitel | Friedensstifter / Zwei Nachbarn, ein Feldweg und sieben Gespräche |
| Status `read` | Du hast das Buch gelesen |
| Status `reading` | Du liest gerade Teil {n} |
| Status `not_yet` | Noch nicht gelesen |
| Link Status | ändern › |
| Link Seite | Mehr zum Buch → |

**„Wie es funktioniert“, Block „Das Buch zur App“**

Bei `BOOK_REFERENCES_LIVE = false`:
> Zur App gibt es ein Buch: *Friedensstifter – Zwei Nachbarn, ein Feldweg und sieben Gespräche.* Darin stellt Mara die Fragen, so wie hier dein Begleiter. Die App funktioniert auch ohne das Buch.

Bei `BOOK_REFERENCES_LIVE = true` (ab B1):
> Zur App gibt es ein Buch: *Friedensstifter – Zwei Nachbarn, ein Feldweg und sieben Gespräche.* Darin stellt Mara die Fragen, so wie hier dein Begleiter. Wenn du das Buch kennst, erinnert er dich ab und zu an eine passende Szene. Die App funktioniert auch ohne das Buch.

Link: Mehr zum Buch →

**Heute, Zustand A**
> Zur App gibt es auch ein Buch →

Sprachprinzip geprüft: kein „müssen“, kein „Du brauchst“, kein absolutes „immer“ oder „nie“, keine Werbesprache, keine Coaching-Vokabeln.

---

## 6. Tests

### 6.1 Unit-Tests `bookStatus.test.js`

| Fall | Erwartung |
|---|---|
| `isValidBookStatus('read', null)` | `true` |
| `isValidBookStatus('not_yet', null)` | `true` |
| `isValidBookStatus('reading', 3)` | `true` |
| `isValidBookStatus('reading', null)` | `false` |
| `isValidBookStatus('reading', 0)` / `8` / `2.5` | `false` |
| `isValidBookStatus('read', 3)` | `false` |
| `isValidBookStatus('gelesen', null)` | `false` |
| `bookStatusLine('reading', 3, text)` | „Du liest gerade Teil 3“ |
| `bookStatusLine(null, null, text)` | `null` |

### 6.2 `attack-test.mjs` (Kennungen statt Nummern, Reihenfolge-Dokument Regel 2)

| Kennung | Prüfung | Erwartung |
|---|---|---|
| **T1-a** | Nutzer A: direkter `PATCH /profiles?id=eq.<B>` mit `book_status='read'` | 0 Zeilen, Zeile von B unverändert |
| **T1-b** | Nutzer A: `rpc/set_book_status` mit `('gelesen', null)`, `('reading', null)`, `('reading', 0)`, `('reading', 8)`, `('read', 3)` | jeweils Fehler (`invalid_book_status` bzw. `invalid_book_progress`), Zeile von A unverändert |
| **T1-c** | `rpc/set_book_status` als anon | Fehler (401/403 bzw. `not_authenticated`), keine Änderung |
| **T1-d** | Nutzer A: direkter `PATCH /profiles?id=eq.<A>` mit `book_status='read'` | Schutz-Trigger greift wie bei `plan` (Fehler oder Wert unverändert, je nach Phase 0, Punkt 2) |
| **T1-e** | Nutzer A: `rpc/set_book_status('reading', 4)`, danach `('read', null)` | erst `reading`/4, dann `read`/`null`, `book_status_at` jeweils neu gesetzt |
| **T1-f** | Nur falls die Testumgebung aal1-Sitzungen kann (wie bei den Tests zu `set_learning_opt_in`): Nutzer mit MFA, Sitzung aal1 | `mfa_required`, keine Änderung |

---

### ⛔ STOPP J-T2: Test auf dem Gerät

> 👤 **Jerome:** Mergen, Deploy abwarten, dann auf dem Handy (installierte App) und am Desktop:
> 1. **Profil:** Die Buch-Karte steht unter der Coaching-Karte, Cover ist scharf, keine Status-Zeile bei neuem Konto.
> 2. **Buch-Seite** über „Mehr zum Buch →“: Text vollständig und wörtlich, Cover ohne Layout-Sprung, Zurück-Pfeil führt ins Profil, BottomNav ohne aktiven Tab.
> 3. **E-Book-Link** öffnet Amazon in einem neuen Tab bzw. im System-Browser, die URL enthält keine zusätzlichen Parameter. Taschenbuch zeigt „erscheint am 27.11.“ ohne Link.
> 4. **Status:** „Noch nicht“ → „Gespeichert“. „Ich lese gerade“ → Teile erscheinen, noch kein „Gespeichert“. Teil 3 wählen → „Gespeichert“. Seite neu laden → Teil 3 ist gewählt.
> 5. **Profil:** zeigt „Du liest gerade Teil 3“. „ändern ›“ springt direkt zum Status-Abschnitt.
> 6. „Ja, durchgelesen“ → Profil zeigt „Du hast das Buch gelesen“. Auf einem zweiten Gerät einloggen → gleicher Status.
> 7. **Fehlerfall:** Flugmodus, dann Status ändern → Fehlermeldung, Auswahl springt zurück, kein „Gespeichert“.
> 8. **„Wie es funktioniert“:** Block „Das Buch zur App“ nach „Was steckt dahinter?“, ohne Satz über Szenen-Erinnerungen. **Heute** mit neuem Konto (Zustand A): Link unter „So funktioniert's“. Mit Konto mit Gesprächen: kein Link.
> 9. **Datenexport** im Profil: `book_status`, `book_progress`, `book_status_at` sind enthalten.
> 10. **VoiceOver** kurz: Radios werden als Gruppe angesagt, „Gespeichert“ wird vorgelesen.
> 11. **Supabase:** `app_logs` zeigt `book_page_viewed`, `book_link_clicked`, `book_status_set` ohne Inhalte und ohne Nutzer-IDs in den Event-Daten.

---

## 7. Abschluss

1. `npm test` (inkl. `bookStatus.test.js`), `npm run build`, `npm run security:test` alle PASS.
2. `ARCHITECTURE.md`: neue Route `/buch`, neue Dateien, Datenmodell (`profiles.book_*`, RPC `set_book_status`, Erweiterung Schutz-Trigger), Feature-Konstante `BOOK_REFERENCES_LIVE`, Log-Codes.
3. Abschlussbericht `docs/buch/t1-abschlussbericht.md` **und** im Chat: Status, Phase-0-Befunde (vor allem Mechanismus des Schutz-Triggers), tatsächliche Migrationsnummer, Diff des Schutz-Triggers gegen 040, geänderte Dateien, Testergebnisse, offene Fragen.

### ⛔ STOPP J-T3: Abnahme

> 👤 **Jerome:** Gerätetest J-T2 vollständig, Tests PASS, Abschlussbericht gelesen.

---

## 8. Nachtrag ab 27.11.: Taschenbuch-Link

Sobald Jerome den Link liefert, eigener kleiner Branch `chore/t1-taschenbuch-link`:

- In `src/content/book.js` `paperbackUrl` setzen (ohne Affiliate-Parameter, Form `https://www.amazon.de/dp/<ASIN>`).
- Sonst nichts. Kurzer Test: Knopf „Als Taschenbuch →“ erscheint und öffnet Amazon.

---

## 9. Für B1 vorgemerkt (nicht Teil von T1)

- **Einmalige Frage auf Heute** nach dem ersten abgeschlossenen Gespräch (Konzept 2.1) und die **Lesestand-Karte höchstens einmal im Monat** (Konzept 2, „Lesestand aktuell halten“). Beides erst, wenn der Status eine Wirkung hat.
- **`BOOK_REFERENCES_LIVE` auf `true`:** Hinweis T1-6 verschwindet, „Wie es funktioniert“ zeigt die zweite Textvariante.
- **Bedeutung von `book_progress`** (T1-8): Der Nutzer ist gerade in Teil N. B1 legt fest, ob 🔒-Einträge aus Teil N schon erlaubt sind oder erst ab N+1.
- **Position 0 und 8:** Vorweg für alle Leser, Epilog nur bei `read` (T1-3).

---

## 10. Definition of Done

- [ ] `/buch` zeigt den freigegebenen Text wörtlich, das Cover als lokale Datei und die Amazon-Links ohne Tracking. Das Taschenbuch steht bis zum Link als „erscheint am 27.11.“ da.
- [ ] Die Seite liegt hinter Login, in `AppShell` ohne aktiven Tab, mit Zurück-Pfeil.
- [ ] Der Buch-Status wird nur über `set_book_status` gespeichert. Die `book_*`-Spalten stehen auf der Sperrliste des Schutz-Triggers. CHECK-Constraints sichern Status, Lesestand 1–7 und ihre Kombination.
- [ ] „Ich lese gerade“ ohne Teil wird nicht gespeichert. „Gespeichert“ erscheint erst nach Erfolg, Fehler werden angezeigt und setzen die Auswahl zurück.
- [ ] Profil-Karte unter der Coaching-Karte mit Status-Zeile und Sprung zum Status-Abschnitt.
- [ ] Block in „Wie es funktioniert“ und dezenter Link auf Heute (nur Zustand A).
- [ ] Hinweis T1-6 sichtbar, solange `BOOK_REFERENCES_LIVE = false`.
- [ ] Keine Änderung an Gespräch, Prompts oder Edge Functions außer `monitorRules.ts`.
- [ ] Barrierefrei: echte Radios mit Labels, Gruppen mit Namen, `aria-live` für die Rückmeldung, ≥ 44 px.
- [ ] Unit-Tests, Angriffstests T1-a bis T1-e (T1-f, falls möglich) PASS. `ARCHITECTURE.md` und Abschlussbericht aktualisiert.

---

*Handoff T1 Buch-Seite v1 · erstellt mit Claude für Jerome Houboi · friedensstifter.coach*
