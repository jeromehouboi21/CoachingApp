# Handoff: B1 Buch-Bezüge im Gespräch und im Spiegel

> **Für:** Claude Code · **Von:** Jerome (vorbereitet mit Claude) · **Stand:** 21.11.2026 · **Version:** v1
> **Grundlage:** „B1 Buch-Bezüge – Bestandsaufnahme für das Handoff“ (Claude Code, 21.11.2026, `main` nach T1 `3e100ba0`), `claude/friedensstifter-konzept-buch-bezuege-v1.md` v1.1 (Abschnitte 3–5, 7), `claude/friedensstifter-buch-landkarte-v1.md` (58 Einträge), `claude/handoff-t1-buch-seite.md` (T1-3, T1-8), `claude/handoff-reihenfolge-offene-pakete.md` (Regeln 1–3)
> **Freigaben von Jerome (21.11.2026):** B-8 Landkarte vollständig freigegeben (alle 58 Einträge inkl. ⚠ und Sonderregeln) · B-9 wörtliche Buchzitate mit „muss“ als Zitat erlaubt · Konzept ohne Anmerkungen bestätigt · B1 kommt direkt nach T1, vor Security-Paket V
> **Ziel:** Wer das Buch gelesen hat oder gerade liest, bekommt vom Begleiter gelegentlich eine Brücke zu einer passenden Szene: erst als Frage, höchstens einmal pro Gespräch, nur aus freigegebenen Stellen und nie über den eigenen Lesestand hinaus. Im Muster-Detail des Spiegels steht für Leser die Fundstelle „Im Buch“. Wer das Buch nicht kennt, merkt von alledem nichts.

---

## Entscheidungen

Die Bestandsaufnahme nennt sieben offene Punkte (E1–E7). Hier die Vorschläge. Jerome bestätigt sie in **J-B1**, vorher wird nicht gebaut.

| # | Frage | Vorschlag | Begründung |
|---|---|---|---|
| **E1** | Wellness ≤ 3 nach der Eröffnung | **Merker statt Wert:** neue Spalte `conversations.book_blocked` (Boolean). Wird serverseitig gesetzt, wenn das Gespräch mit Wellness-Wert ≤ 3 startet **oder** in diesem Gespräch ein Krisenhinweis erkannt wurde. Einmal `true`, bleibt es so. Kein Wert, kein Grund gespeichert | Deckt Wellness und frühere Krisen mit **einem** Feld ab, ohne pro Turn `crisis_events` abzufragen. Speichert keine Gesundheitsangabe |
| **E2** | Auswahl der Stellen | **Kleiner Auswahlschritt mit Haiku** an höchstens drei festen Zeitpunkten im Gespräch: Haiku bekommt die letzten Nachrichten und eine kompakte Liste der für diesen Leser erlaubten Stellen (Kennung, Titel, „passt, wenn“) und wählt 0–2 Kennungen. Nur bei einem Treffer geht der Block BUCH-STELLEN an den Coach. **Abweichung vom Konzept 5.2** (Auswahl über Muster-Schlüssel) | Muster-Schlüssel erreichen nur 17 von 58 Stellen und kennen das laufende Gespräch nicht (Befunde 2 und 3). Die ganze Liste im Coach-Prompt wäre teurer und verleitet zum Buchbezug. Anthropic ist schon Empfänger, kein neuer Datenfluss |
| **E3** | „Bezug genutzt“ merken | **Das Angebot zählt:** Ist der Block in einem Gespräch einmal mitgegangen, öffnet sich kein zweites Fenster. Gespeichert werden `book_offered_reply` und `book_passage_ids` an `conversations`. Keine Erkennung in `post-conversation`. Ersetzt `book_reference_used` aus dem Konzept | Einfach, robust, deckt Haltung 2 ab. Die Lernbasis bleibt unberührt |
| **E4** | Taktung | Prüfung frühestens ab 4 Nachrichten im Verlauf, vor der **3., 6. und 9. Antwort** des Coaches. Bei einem Treffer bleibt der Block für **3 Antworten** offen (Einladen, ggf. Szene anbieten, zurück zum Menschen), danach nie wieder in diesem Gespräch. Kein Buch-Block im selben Turn wie Stimmen- oder Mechanismus-Block: An einem Prüf-Zeitpunkt entfällt dann die Prüfung, im offenen Fenster entfällt der Buch-Block für diese Antwort | Haltung 1 braucht mehr als einen Turn. Bestehende Funktionen haben Vorrang |
| **E5** | 🔒 bei `reading` | Bei Lesestand N: normale Stellen bis Position N, 🔒-Auflösungen nur bis Position **N − 1**. Position 0 immer, Epilog (8) nur bei `read` | „Teil, in dem du gerade bist“ (T1-8): Die Auflösung kann im aktuellen Teil noch vor dem Leser liegen |
| **E6** | Spiegel-Hinweis | Schmale RPC `get_book_hints(p_pattern_key)` liefert höchstens 2 Fundstellen (Teil, Teiltitel, Szenentitel). **Keine ⚠-Einträge.** 🔒 nach denselben Regeln wie E5 | Kein Buchtext im Frontend-Code, nur Fundstellen. ⚠ verlangt, dass der Nutzer das Thema selbst anspricht |
| **E7** | Seed | Tabelle in **045**, Daten in **046** als eigene Migration (Upsert). Die Seed-Migration wird von einem Skript **aus der freigegebenen Landkarte erzeugt**, nicht von Hand | Wörtliche Kernsätze bleiben exakt. Spätere Korrekturen: Landkarte ändern, Skript neu laufen lassen, neue Migration |

**Zusätzlich (ebenfalls Bestätigung in J-B1):**

| # | Frage | Vorschlag |
|---|---|---|
| **B1-1** | Fragt der Mensch selbst nach dem Buch, ohne dass ein Block mitgeht | Eine Zeile im BASE-Prompt: Der Coach erzählt nichts über den Inhalt und verweist auf „Das Buch zur App“ im Profil. Schützt gegen erfundene Buchinhalte (Regel 6). Text in 5.3 |
| **B1-2** | Schrittweise Freischaltung | Server-Schalter `BOOK_REFERENCES_MODE` = `off` · `admin` · `all`. Erst `admin` (nur Jeromes Konto) für den Szenario-Test, dann `all` zusammen mit `BOOK_REFERENCES_LIVE = true` im Frontend |

---

## 0. Spielregeln für Claude Code

Alle Regeln aus `CLAUDE.md`, den bisherigen Paketen und aus `handoff-reihenfolge-offene-pakete.md` gelten weiter. Besonders wichtig hier:

1. **Branch** `feature/b1-buch-bezuege` von aktuellem `main`.
2. **Migrationen:** nächste freie Nummern zum Startzeitpunkt (laut Bestandsaufnahme **045** und **046**). Jede mit Kommentar zum Rückgängigmachen.
3. **Lernbasis bleibt sauber (S-13):** Keine Änderung an `post-conversation`, insbesondere nicht an der anonymen Zusammenfassung. Buch-Status, Lesestand und Buchstellen gehen in **keinen** Prompt für `experience_patterns`.
4. **Buchinhalte nur aus `book_passages`.** Keine Kernsätze, Situationen oder Titel im Frontend-Code oder in Edge-Function-Code. Der Code kennt nur Kennungen.
5. **Texte:** Prompt-Texte und UI-Texte stehen in Abschnitt 5 und gelten erst nach Jeromes Freigabe in J-B1. Claude Code schreibt keine eigenen Inhaltstexte.
6. **Fail-safe:** Jeder Fehler im Buch-Pfad (Abfrage, Auswahlschritt, Zeitüberschreitung, ungültige Antwort) führt zu **keinem Buch-Block**, nie zu einem Fehler im Gespräch. Geloggt wird nur der Code.
7. **FORTSETZUNG/WEITERARBEITEN bleibt der letzte Block** (Lehre aus U5a). BUCH-STELLEN kommt direkt davor, nach BLOCK 7.
8. **Logs:** Stellen-Kennungen (`T3-D1`) sind erlaubt, Kernsätze, Titel, Situationen und Nachrichteninhalte nicht. Keine Nutzer- oder Gesprächs-IDs in Event-Daten.
9. **Keine neuen Pakete.** Der Auswahlschritt nutzt den bestehenden Anthropic-Aufruf aus `_shared` (Modellkonstante, Token-Logging, Timeout).
10. **Keine Deploys.** An jedem **⛔ STOPP** an Jerome übergeben.

---

## 1. Was im Gespräch passiert

```
Jede Nachricht an `chat`
  │
  ├─ Krisenhinweis in dieser Nachricht?  ──ja──► CRISIS_RESPONSE_BLOCK (wie bisher)
  │                                              + conversations.book_blocked = true
  │
  ├─ Eröffnung mit Wellness-Wert ≤ 3?    ──ja──► conversations.book_blocked = true (weiter wie bisher)
  │
  └─ Buch-Pfad (nur wenn alles zutrifft):
       · BOOK_REFERENCES_MODE erlaubt diesen Nutzer (off / admin / all)
       · profiles.book_status in ('read', 'reading')
       · conversations.book_blocked = false
       · open_thread_intensity ≠ 'high' (eigenes Gespräch beim Fortsetzen und letztes anderes Gespräch)
       │
       ├─ Fenster offen? (book_offered_reply gesetzt, diese Antwort liegt im Fenster von 3)
       │     └─ ja: Stellen aus book_passage_ids laden ──► BLOCK 8 BUCH-STELLEN
       │            (entfällt in dieser Antwort, wenn Stimmen- oder Mechanismus-Block fällig ist)
       │
       ├─ Fenster schon vorbei? ──► nichts mehr in diesem Gespräch
       │
       └─ Prüf-Zeitpunkt? (Antwort Nr. 3, 6 oder 9, Verlauf ≥ 4 Nachrichten,
          kein Stimmen- oder Mechanismus-Block fällig)
             └─ Auswahlschritt (Haiku, Timeout 2,5 s)
                  ├─ 0 Treffer / Fehler ──► kein Block
                  └─ 1–2 Treffer ──► book_offered_reply + book_passage_ids speichern
                                     ──► BLOCK 8 BUCH-STELLEN (Antwort 1 von 3)
```

**Im Spiegel:** Muster-Detail `/mirror/muster/:key` → `rpc('get_book_hints', { p_pattern_key })` → höchstens 2 Zeilen „Im Buch: Teil 3 · Die Kampagne – Die Tabelle“. Für Nicht-Leser leer.

---

## 2. Phase 0: Restfragen zur Bestandsaufnahme

Die Bestandsaufnahme vom 21.11. gilt. Antworten mit Pfad und Zeile in `docs/buch/b1-phase0.md`.

1. **Eröffnung mit Wellness:** Aufbau von `b.wellnessCheck` (Feldname des Werts) und an welcher Stelle die `conversations`-Zeile im Eröffnungs-Turn angelegt wird. `book_blocked` soll möglichst schon beim Anlegen gesetzt werden.
2. **Krisenpfad:** Wo (Z. 1479–1485, 1678) lässt sich mit dem Service-Client `book_blocked = true` setzen, ohne die Krisenantwort zu verzögern (z. B. im bestehenden `waitUntil`)?
3. **Antwortnummer:** Was zählt `assistantTurnCount` (Z. 1469) genau? Gibt es eine Begrüßung des Coaches vor der ersten Nutzernachricht? Daraus ergibt sich `replyNo` = Nummer der Antwort, die gerade entsteht (1-basiert). Beim Fortsetzen zählt sie im selben Gespräch weiter.
4. **Stimmen und Mechanismus:** Wie werden `offerMechanism`, `introduceVoice` und `namingVoice` bestimmt? Sind sie einmalig (an einen bestimmten Turn gebunden) oder bleiben sie fällig, bis sie gesendet wurden? (Für E4 reicht es zu wissen, **ob** sie in diesem Turn gesendet werden.)
5. **Modell und Hilfsfunktionen:** Name der Haiku-Konstante in `_shared/models.ts`, bestehender Helper für einen nicht-streamenden Anthropic-Aufruf (mit `extractText`, Token-Logging, `AbortController`). Gibt es schon einen JSON-Parser für Modellantworten (z. B. aus `post-conversation`)?
6. **`loadCoachContext`:** Aufbau des `Promise.all`. Die Buch-Abfragen (5.1) kommen dort hinein.
7. **Schutz-Trigger `protect_conversation_server_columns`:** letzte Fassung (023 oder später?) und wie der Server ihn passiert (Service-Rolle?).
8. **Export:** Ort von `EXPORT_TABLES`/`EXCLUDED_TABLES` in `export-my-data`.
9. **Frontend:** Ist `is_admin` und `book_status` im geladenen Profil verfügbar (für den Spiegel-Hinweis im Modus `admin`)? Aufbau von `PatternDetailScreen.jsx` Z. 28–36.
10. **Tests:** Erweiterung des Globs in `npm test` um `supabase/functions/_shared/**/*.test.ts` (Node v24, ohne neue Abhängigkeit). Prüfen, dass `bookSelection.ts` keine Imports braucht.
11. **Landkarte im Repo:** Jerome legt `claude/friedensstifter-buch-landkarte-v1.md` unter `docs/buch/buch-landkarte-v1.md` ab (J-B1). Das Repo bleibt privat, weil dann Kernsätze darin stehen.

---

### ⛔ STOPP J-B1 (vor dem Bauen, Jerome)

> 👤 **Jerome:**
> 1. E1–E7 sowie B1-1 und B1-2 bestätigen oder ändern.
> 2. Texte in Abschnitt 5 freigeben (Auswahl-Prompt, Block BUCH-STELLEN, BASE-Zeile, Spiegel).
> 3. Landkarte als `docs/buch/buch-landkarte-v1.md` ins Repo legen.

---

## 3. Datenbank

### 3.1 Migration `045_b1_book_passages.sql`

```sql
-- B1 Buch-Bezüge: Tabelle book_passages, Spalten an conversations, RPC get_book_hints
--
-- Rückgängig machen:
--   drop function if exists public.get_book_hints(text);
--   -- protect_conversation_server_columns auf den Stand vor 045 zurücksetzen
--   alter table public.conversations
--     drop constraint if exists conversations_book_passage_ids_check,
--     drop column if exists book_passage_ids,
--     drop column if exists book_offered_reply,
--     drop column if exists book_blocked;
--   drop table if exists public.book_passages;

create table if not exists public.book_passages (
  id                    text primary key,               -- 'T3-D1', 'V-1', 'DD-2', 'EP-3' (aus der Landkarte)
  kind                  text not null check (kind in ('dialog', 'erklaerung', 'jerome')),
  position              int  not null check (position between 0 and 8),
  part_title            text not null,                  -- 'Die Kampagne', 'Vorweg', 'Davor und danach', 'Epilog'
  season_label          text,                           -- 'erster Frost'
  title                 text not null,
  situation_summary     text not null,                  -- „Situation“ bzw. bei Erklärungen „Inhalt“
  key_quote             text not null,                  -- wörtlich, ohne äußere Anführungszeichen
  bridge_question       text,
  fits_when             text,
  book_questions        text[] not null default '{}',
  pattern_keys          text[] not null default '{}',
  mechanisms            text[] not null default '{}',
  themes                text[] not null default '{}',
  coach_note            text,                           -- „Hinweis“ aus der Landkarte (neu gegenüber Konzept)
  is_resolution         boolean not null default false, -- 🔒
  is_sensitive          boolean not null default false, -- ⚠
  sensitive_rule        text,                           -- „Sonderregel“ aus der Landkarte
  is_active             boolean not null default true,
  approved_by_jerome_at timestamptz,
  updated_at            timestamptz not null default now(),
  constraint book_passages_sensitive_rule_check
    check (not is_sensitive or sensitive_rule is not null)
);

comment on table public.book_passages is
  'Kuratierte, von Jerome freigegebene Stellen aus "Friedensstifter". Keine Nutzerdaten. Nur service_role.';

alter table public.book_passages enable row level security;
-- Keine Policies: Lesen nur serverseitig.
revoke all on table public.book_passages from public, anon, authenticated;
grant select on table public.book_passages to service_role;

-- Spalten am Gespräch (nur Server schreibt)
alter table public.conversations
  add column if not exists book_blocked       boolean not null default false,
  add column if not exists book_offered_reply int,
  add column if not exists book_passage_ids   text[];

alter table public.conversations
  add constraint conversations_book_passage_ids_check
    check (book_passage_ids is null or cardinality(book_passage_ids) between 1 and 2);

comment on column public.conversations.book_blocked is
  'Keine Buch-Bezüge in diesem Gespräch (Sicherheitsregel 4). Kein Wert, kein Grund gespeichert.';
comment on column public.conversations.book_offered_reply is
  'Nummer der Coach-Antwort, mit der das Buch-Fenster begann. null = nie angeboten.';
comment on column public.conversations.book_passage_ids is
  'Kennungen der mitgegebenen Buchstellen (max. 2), z. B. {T3-D1}. Keine Buchtexte.';
```

**Schutz-Trigger:** `protect_conversation_server_columns` aus der letzten Fassung (Phase 0, Punkt 7) **vollständig** übernehmen und `book_blocked`, `book_offered_reply`, `book_passage_ids` auf die Sperrliste setzen. Sonst nichts ändern. Diff in den Abschlussbericht.

**RPC für den Spiegel (in derselben Migration):**

```sql
create or replace function public.get_book_hints(p_pattern_key text)
returns table (passage_id text, part_no int, part_name text, scene_title text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_status   text;
  v_progress int;
begin
  if not public.mfa_satisfied() then
    raise exception 'mfa_required' using errcode = '42501';   -- Code wie in set_book_status
  end if;
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_pattern_key is null or p_pattern_key !~ '^[a-z_]{1,40}$' then
    return;
  end if;

  select p.book_status, p.book_progress
    into v_status, v_progress
    from public.profiles p
   where p.id = v_uid;

  if v_status is null or v_status not in ('read', 'reading') then
    return;
  end if;

  return query
    select b.id, b.position, b.part_title, b.title
      from public.book_passages b
     where b.is_active
       and b.approved_by_jerome_at is not null
       and not b.is_sensitive
       and p_pattern_key = any (b.pattern_keys)
       and (
             v_status = 'read'
          or (b.position <= v_progress
              and (not b.is_resolution or b.position < v_progress))
           )
     order by b.position, b.id
     limit 2;
end;
$$;

revoke all on function public.get_book_hints(text) from public, anon;
grant execute on function public.get_book_hints(text) to authenticated;
```

Bei `reading` ist der Epilog (8) automatisch ausgeschlossen, weil `book_progress` höchstens 7 ist. Position 0 ist immer dabei.

### 3.2 Migration `046_b1_book_passages_seed.sql` (erzeugt, nicht von Hand)

**Skript** `scripts/build-book-seed.mjs` (Node, ohne Abhängigkeiten):

```
node scripts/build-book-seed.mjs docs/buch/buch-landkarte-v1.md \
  --approved-at 2026-11-21 > supabase/migrations/046_b1_book_passages_seed.sql
```

**Eingabeformat der Landkarte** (so ist sie aufgebaut):

| Element | Beispiel | Feld |
|---|---|---|
| Abschnitt `## Vorweg` | | `part_title = 'Vorweg'`, `season_label = null` |
| Abschnitt `## Teil 3 – Die Kampagne (erster Frost)` | | `part_title = 'Die Kampagne'`, `season_label = 'erster Frost'` |
| Abschnitt `## Davor und danach (Jerome)` | | `part_title = 'Davor und danach'`, `season_label = null` |
| Abschnitt `## Epilog` | | `part_title = 'Epilog'`, `season_label = null` |
| Eintrag `**T5-D2 · Mara und Ines** ⚠ — `dialog` · Pos. 5` | | `id`, `title`, `is_sensitive` (⚠), `is_resolution` (🔒), `kind`, `position` |
| `- **Situation:** …` bzw. `- **Inhalt:** …` | | `situation_summary` |
| `- **Kernsatz:** „…“` | | `key_quote` (äußere `„` und `“` bzw. `"` entfernen, Inneres unverändert) |
| `- **Muster:** \`a\` · **Mechanismen:** \`b\` · \`c\` · **Themen:** X, Y` | | `pattern_keys`, `mechanisms`, `themes` (Themen an Kommas trennen) |
| `- **Passt, wenn:** …` | | `fits_when` |
| `- **Brückenfrage:** …` | | `bridge_question` (vollständig, auch mit „Danach: …“) |
| `- **Fragen aus dem Buch:** „…“ · „…“` | | `book_questions` (an `“ · „` trennen, äußere Zeichen entfernen) |
| `- **Hinweis:** …` | | `coach_note` |
| `- **Sonderregel:** …` | | `sensitive_rule` |
| `- **Kette:** …` | | ignorieren |
| Abschnitte vor `## Vorweg` und ab `## Hinweise für die Umsetzung` | | ignorieren |

In Textfeldern Markdown-Hervorhebungen (`*…*`, Backticks) entfernen, typografische Anführungszeichen und Apostrophe (`’`) **unverändert** lassen. SQL-Strings mit `$q$…$q$` oder sauberem Escaping, nie mit String-Verkettung ohne Escaping.

**Pflichtprüfungen im Skript** (Abbruch mit Fehlermeldung, keine Ausgabe):
- genau **58** Einträge, davon `dialog` 28, `erklaerung` 13, `jerome` 17
- genau **8** mit ⚠ und **8** mit 🔒
- jede `id` eindeutig und passend zu `^(V-\d|T[1-7]-(D\d|E\d?|J\d?)|DD-\d|EP-\d)$`
- `position` passt zum Abschnitt (Vorweg 0, Teil n → n, Davor und danach 6, Epilog 8)
- jeder Eintrag hat `situation_summary` und `key_quote`; jeder ⚠-Eintrag hat `sensitive_rule`
- `pattern_keys` nur aus den 5 Schlüsseln von `src/lib/patterns.js`

**Ausgabe:**

```sql
-- B1 Seed: 58 Stellen aus der freigegebenen Buch-Landkarte (B-8, 21.11.2026)
-- Erzeugt von scripts/build-book-seed.mjs aus docs/buch/buch-landkarte-v1.md. Nicht von Hand ändern.
-- Rückgängig machen: delete from public.book_passages;
insert into public.book_passages (id, kind, position, part_title, season_label, title, situation_summary,
  key_quote, bridge_question, fits_when, book_questions, pattern_keys, mechanisms, themes, coach_note,
  is_resolution, is_sensitive, sensitive_rule, is_active, approved_by_jerome_at)
values
  (...), ...
on conflict (id) do update set
  kind = excluded.kind, position = excluded.position, ... , updated_at = now();
```

Spätere Änderungen an der Landkarte: Datei ändern, Skript erneut laufen lassen, **neue** Migration mit der nächsten freien Nummer. Eine angewendete Migration wird nie geändert.

### 3.3 Was sich nicht ändert

- **`profiles`:** keine neue Spalte. Status und Lesestand aus T1.
- **Export:** neue `conversations`-Spalten über `select('*')` automatisch dabei. `book_passages` in `EXCLUDED_TABLES` mit Begründung „keine Nutzerdaten“.
- **Löschen:** `conversations` per CASCADE wie bisher. `book_passages` hat keinen Nutzerbezug.
- **Aufbewahrung (`apply_retention`):** keine Änderung.

---

## 4. Server: `chat`

### 4.1 `supabase/functions/_shared/bookSelection.ts` (neu, rein, ohne Imports)

Alle Regeln als reine Funktionen, damit sie mit `node --test` geprüft werden können.

```ts
export const BOOK_MIN_HISTORY = 4;           // Nachrichten im Verlauf vor dem ersten Prüfen
export const BOOK_CHECK_REPLIES = [3, 6, 9]; // Coach-Antwort Nr., vor der geprüft wird
export const BOOK_WINDOW_REPLIES = 3;        // so viele Antworten bleibt der Block offen
export const BOOK_MAX_CANDIDATES = 2;
export const BOOK_SELECT_TIMEOUT_MS = 2500;

export type BookStatus = 'read' | 'reading' | 'not_yet' | null;
export type Passage = {
  id: string; kind: 'dialog' | 'erklaerung' | 'jerome'; position: number;
  part_title: string; title: string; situation_summary: string; key_quote: string;
  bridge_question: string | null; fits_when: string | null; book_questions: string[];
  themes: string[]; coach_note: string | null;
  is_resolution: boolean; is_sensitive: boolean; sensitive_rule: string | null;
  is_active: boolean; approved_by_jerome_at: string | null;
};

// Erlaubt der Schalter diesen Nutzer?
export function modeAllows(mode: string | undefined, isAdmin: boolean): boolean;
//   'all' → true · 'admin' → isAdmin · alles andere (auch undefined) → false

// Darf der Buch-Pfad in diesem Turn überhaupt laufen?
export function bookPathOpen(i: {
  modeAllowed: boolean; status: BookStatus; bookBlocked: boolean;
  crisisNow: boolean; ownThreadHigh: boolean; lastThreadHigh: boolean;
}): boolean;

// Welche Stellen darf dieser Leser bekommen? (E5)
export function eligiblePassages(all: Passage[], status: BookStatus, progress: number | null): Passage[];
//   nur is_active && approved_by_jerome_at
//   'read'    → alle
//   'reading' → position <= progress && (!is_resolution || position < progress)
//   sonst     → []

// Was passiert in dieser Antwort? (E4)
export function bookStep(i: {
  replyNo: number; historyLength: number; offeredReply: number | null; collision: boolean;
}): 'window' | 'window_skip' | 'check' | 'check_skip' | 'none';
//   offeredReply != null:
//     replyNo < offeredReply + BOOK_WINDOW_REPLIES → collision ? 'window_skip' : 'window'
//     sonst → 'none'
//   offeredReply == null:
//     historyLength >= BOOK_MIN_HISTORY && BOOK_CHECK_REPLIES.includes(replyNo)
//       → collision ? 'check_skip' : 'check'
//     sonst → 'none'

// Liste für den Auswahlschritt (eine Zeile pro Stelle, keine Kernsätze)
export function buildSelectionIndex(passages: Passage[]): string;
//   "T3-D1 | Die Tabelle | passt, wenn: <fits_when>"
//   ohne fits_when: erster Satz von situation_summary
//   ⚠: Zeile endet mit " [SENSIBEL – nur wenn der Mensch das Thema selbst anspricht: <themes>]"

// Antwort des Auswahlschritts prüfen
export function parseSelection(raw: string, allowedIds: Set<string>):
  { ok: true; ids: string[] } | { ok: false; reason: 'parse' | 'invalid_ids' };
//   JSON {"ids": [...]} (auch in ```json-Fence), Duplikate raus, nur erlaubte Kennungen,
//   höchstens BOOK_MAX_CANDIDATES. Unbekannte Kennung → reason 'invalid_ids', ids leer.

// Block BUCH-STELLEN (Text aus Abschnitt 5.2)
export function buildBookBlock(i: {
  passages: Passage[]; status: 'read' | 'reading'; progress: number | null; windowReply: 1 | 2 | 3;
}): string;
```

### 4.2 Kontext laden (`loadCoachContext`, Z. 960)

In das bestehende `Promise.all`:

1. `profiles`: `book_status, book_progress, is_admin` der eigenen Zeile (Service-Client, `eq('id', userId)`). Getrennt von `requireConsent`, das fachlich zur Zustimmung gehört.
2. `conversations`: `book_blocked, book_offered_reply, book_passage_ids` des aktuellen Gesprächs (falls nicht schon in einer bestehenden Abfrage enthalten).

Erst wenn `bookStep()` `'window'` oder `'check'` liefert:

- `'window'`: `book_passages` mit `id = any(book_passage_ids)` laden.
- `'check'`: alle aktiven, freigegebenen `book_passages` laden (58 Zeilen, klein), mit `eligiblePassages()` filtern. Ist die Liste leer → kein Auswahlschritt.

### 4.3 Auswahlschritt (nur bei `'check'`)

- Modell: die bestehende **Haiku-Konstante** aus `_shared/models.ts`. Nicht streamend, `max_tokens` 60, Timeout `BOOK_SELECT_TIMEOUT_MS` über `AbortController`.
- **System:** Text aus 5.1.
- **User-Inhalt:**
  ```
  STELLEN:
  <buildSelectionIndex(eligible)>

  LETZTE NACHRICHTEN:
  Mensch: …
  Coach: …
  ```
  Die letzten 6 Nachrichten des Verlaufs, jede auf 600 Zeichen gekürzt, die aktuelle Nutzernachricht als letzte.
- Antwort mit `parseSelection()` prüfen.
- **Treffer (1–2 Kennungen):** `conversations` setzen: `book_offered_reply = replyNo`, `book_passage_ids = ids` (Service-Client, vor dem Prompt-Bau, Fehler beim Schreiben → kein Block und Log `book_select_failed { reason: 'store' }`). Dann Block mit `windowReply = 1`.
- **Kein Treffer, Fehler, Timeout:** kein Block, Gespräch läuft normal weiter. Der nächste Prüf-Zeitpunkt kommt wie geplant.
- Token-Logging wie bei den anderen Aufrufen, Kennzeichnung `chat_book_select`.
- **Latenz:** Der Auswahlschritt läuft nur an höchstens drei Antworten pro Gespräch und nur für Leser. Er startet, sobald Profil und Gesprächszeile geladen sind, und darf parallel zu den übrigen Abfragen laufen. Mehr als `BOOK_SELECT_TIMEOUT_MS` darf er die Antwort nicht verzögern.

### 4.4 Sicherheitsregel 4 umsetzen

- **Eröffnung:** Ist der Wellness-Wert ≤ 3, beim Anlegen bzw. direkt nach dem Anlegen der Gesprächszeile `book_blocked = true` setzen. Log `book_blocked_set { reason: 'wellness' }`.
- **Krise:** Im Krisenpfad zusätzlich `book_blocked = true` setzen (im Hintergrund, die Krisenantwort wird nicht verzögert). Log `book_blocked_set { reason: 'crisis' }`.
- **`open_thread_intensity = 'high'`:** im eigenen Gespräch (Fortsetzen, Z. 1412) oder im letzten anderen Gespräch (Z. 980) → `bookPathOpen()` liefert `false`. Wird nicht gespeichert, gilt pro Turn.
- Der Krisenpfad selbst bleibt wie er ist: `CRISIS_RESPONSE_BLOCK` ohne Buch.

### 4.5 Kollision mit Stimmen und Mechanismus (E4)

`collision = offerMechanism || introduceVoice || namingVoice` für **diesen** Turn (Phase 0, Punkt 4). Die bestehende Logik dieser Blöcke wird **nicht** geändert. Bei Kollision:
- Prüf-Zeitpunkt → `'check_skip'`, kein Auswahlschritt. Log `book_check_skipped { reason: 'collision' }`.
- Fenster → `'window_skip'`, Block entfällt in dieser Antwort, das Fenster läuft weiter. Log `book_block_omitted { reason: 'collision' }`.

### 4.6 Prompt-Bau

- `buildSystemPrompt(...)` bekommt einen zusätzlichen optionalen Parameter `bookBlock?: string` (oder, falls Claude Code das für sauberer hält, ein Options-Objekt für die neuen Teile; dann ohne Verhaltensänderung für die bestehenden 12 Parameter).
- Reihenfolge: … BLOCK 7 Entry → **BLOCK 8 BUCH-STELLEN** → FORTSETZUNG/WEITERARBEITEN (bleibt zuletzt).
- **BASE** bekommt die Zeile aus 5.3 (B1-1). Sie steht im statischen Teil und gilt für alle Nutzer.
- `HOWTO_SYSTEM_PROMPT` und `CRISIS_RESPONSE_BLOCK` bleiben unverändert.

### 4.7 Schalter

- Secret/Env `BOOK_REFERENCES_MODE` in `chat`: `off` (Standard, auch wenn nicht gesetzt) · `admin` · `all`.
- `get_book_hints` braucht keinen Schalter, der Spiegel-Hinweis ist im Frontend geschaltet (4.9).

### 4.8 Logs

```
book_check            { result: 'selected' | 'none', count: 0–2 }
book_check_skipped    { reason: 'collision' }
book_select_failed    { reason: 'timeout' | 'api' | 'parse' | 'invalid_ids' | 'store' }
book_block_sent       { ids: ['T3-D1'], window_reply: 1–3 }
book_block_omitted    { reason: 'collision' }
book_blocked_set      { reason: 'wellness' | 'crisis' }
```

`_shared/monitorRules.ts`:

```ts
{ id: 'book_usage', codes: ['book_check', 'book_block_sent', 'book_check_skipped', 'book_block_omitted', 'book_blocked_set'], windowMin: 10080, threshold: 0, infoOnly: true },
{ id: 'book_select_error', codes: ['book_select_failed'], windowMin: 1440, threshold: 10 },
{ id: 'book_hints_error', codes: ['book_hints_failed'], windowMin: 1440, threshold: 10 },
```

So sieht Jerome, wie oft geprüft wird, wie oft eine Stelle passt und welche Stellen genutzt werden. Keine Inhalte.

### 4.9 Frontend

**Schalter:** `BOOK_REFERENCES_LIVE` in `src/content/book.js` bleibt bis **J-B3** auf `false`. Mit `true` verschwindet der Hinweis auf der Buch-Seite und „Wie es funktioniert“ zeigt die zweite Textfassung (aus T1, schon gebaut).

**Spiegel, `PatternDetailScreen.jsx`:**
- Sichtbar, wenn `(BOOK_REFERENCES_LIVE || profile.is_admin)` und `profile.book_status` in `('read', 'reading')`. Sonst kein Aufruf.
- `supabase.rpc('get_book_hints', { p_pattern_key: key })`, Ergebnis höchstens 2 Zeilen.
- **Darstellung** unter der Muster-Beschreibung, dezent (kleine Karte mit feinem Rahmen, kein Grün, kein Bild):
  ```
  IM BUCH
  Teil 3 · Die Kampagne – Die Tabelle
  Teil 4 · Wo hast du das her? – Das ist die Tabelle
  ```
  Teil-Bezeichnung: Position 1–7 → `Teil {n} · {part_name}`, sonst nur `{part_name}` („Vorweg“, „Davor und danach“). Darunter der Link „Mehr zum Buch →“ (`/buch`, `state: { from: 'mirror' }`).
- Kein Treffer → nichts anzeigen. Fehler → nichts anzeigen, `logClientError('book_hints_failed', { code })`. Kein Zitat, keine Situation.
- `book_page_viewed` aus T1 bekommt den neuen Wert `from: 'mirror'`.

---

## 5. Texte (Freigabe durch Jerome in J-B1)

Sprachprinzip geprüft: kein „müssen“ außerhalb wörtlicher Buchzitate (B-9), kein „Du brauchst“, kein absolutes „immer“ oder „nie“ als Forderung an den Menschen.

### 5.1 Auswahlschritt (System-Prompt für Haiku)

```
Du ordnest einen Gesprächsausschnitt Stellen aus einem Buch zu. Du sprichst nicht mit dem Menschen.

Unter STELLEN steht für jede Stelle eine Kennung, ein Titel und wann sie passt.
Unter LETZTE NACHRICHTEN steht der Ausschnitt aus einem Coaching-Gespräch.

Wähle höchstens zwei Stellen, die sehr deutlich zu dem passen, was der Mensch gerade selbst erzählt.
Ein gemeinsames Stichwort reicht nicht. Im Zweifel wählst du keine.
Stellen mit [SENSIBEL …] wählst du nur, wenn der Mensch das genannte Thema in diesen Nachrichten selbst angesprochen hat.
Wirkt der Mensch akut belastet, verzweifelt oder in Not, wählst du keine Stelle.

Antworte nur mit JSON, ohne weiteren Text:
{"ids": ["T3-D1"]}  oder  {"ids": []}
```

### 5.2 Block BUCH-STELLEN (BLOCK 8 im Coach-Prompt)

`buildBookBlock()` setzt ihn so zusammen. Zeilen in `{…}` nur, wenn das Feld gesetzt ist bzw. die Bedingung gilt.

```
--- BUCH-STELLEN (nur diese verwenden) ---
Der Mensch kennt Jeromes Buch „Friedensstifter“. {read: Er hat es durchgelesen.}{reading: Er liest gerade Teil {N}. Erwähne nichts, was im Buch erst später passiert.}
Zu diesem Gespräch könnte diese Stelle passen:

[1] {Teil {n} – {part_title} | Vorweg | Davor und danach (zwischen Teil 6 und 7) | Epilog} · {title}
    Art: {Gespräch zwischen Tim und Mara | Erklärung „Was dahintersteckt“ | Jeromes eigene Geschichte}
    Situation: {situation_summary}
    Kernsatz (wörtlich, darf zitiert werden): „{key_quote}“
    {Einladungsfrage: {bridge_question}}
    {Fragen aus dem Buch: „…“ · „…“}
    {Hinweis: {coach_note}}
    {🔒: Diese Stelle löst einen früheren Erzählstrang auf. Erzähle nicht nach, wie es ausgeht.}
    {⚠: SONDERREGEL: {sensitive_rule} Nur die Kernaussage, keine Details. Keine Parallele zu Diagnosen oder Erkrankungen ziehen.}

{[2] … gleicher Aufbau, falls zwei Stellen}

So gehst du damit um:
1. Höchstens EINE Stelle in diesem Gespräch, und nur wenn sie wirklich passt. Lieber keine als eine bemühte.
2. Erst fragen, dann erzählen. Lade zuerst ein, etwa mit der Einladungsfrage oder mit „Erinnert dich das an ein Gespräch zwischen Tim und Mara?“. Erst wenn der Mensch nichts damit verbindet, beschreibe die Szene in ein bis zwei Sätzen.
3. Danach geht es wieder um den Menschen, zum Beispiel: „Was ist bei dir ähnlich, was ist anders als bei Tim?“
4. Verweise nur auf diese Stellen. Erfinde keine Szenen, Dialoge, Zitate oder Erlebnisse und ergänze nichts aus dem Gedächtnis.
5. Höchstens ein bis zwei Sätze wörtlich, alles andere in eigenen Worten.
6. Von Jerome erzählst du nur, was hier steht, in der Form „Jerome erzählt im Buch, wie …“. Nie als deine eigene Erinnerung.
7. Kein Ende verraten, keine Kapitel zusammenfassen. Fragt der Mensch danach, antworte freundlich: „Das liest du am besten selbst. Hier geht es um dich.“
8. Wörtliche Buchzitate dürfen „muss“ enthalten. Deine eigenen Sätze drumherum bleiben ohne „müssen“.
9. Maras Redewendungen übernimmst du nicht als deine eigenen. Du bist nicht Mara.
10. Wirkt der Mensch belastet oder ist er bei einem anderen Thema, lass das Buch weg.
{windowReply 2 oder 3: Diese Stellen hast du schon in einer vorigen Antwort bekommen. Hast du schon eingeladen, knüpf daran an und fang nicht neu an. Hat der Mensch nicht darauf reagiert, lass es.}
--- ENDE BUCH-STELLEN ---
```

### 5.3 Zeile im BASE-Prompt (B1-1)

```
Jeromes Buch „Friedensstifter“ kennst du nur aus Stellen, die dir im Block BUCH-STELLEN mitgegeben werden. Ohne diesen Block erwähnst du das Buch nicht von dir aus. Fragt der Mensch selbst danach, erzählst du nichts über den Inhalt und sagst ihm, dass er im Profil unter „Das Buch zur App“ mehr dazu findet.
```

### 5.4 Spiegel

| Stelle | Text |
|---|---|
| Eyebrow | Im Buch |
| Zeile | Teil {n} · {Teiltitel} – {Szenentitel} (bzw. „Vorweg – …“, „Davor und danach – …“) |
| Link | Mehr zum Buch → |

---

## 6. Tests

### 6.1 Unit-Tests `supabase/functions/_shared/bookSelection.test.ts`

| Fall | Erwartung |
|---|---|
| `modeAllows(undefined, true)` / `('off', true)` | `false` |
| `modeAllows('admin', false)` / `('admin', true)` / `('all', false)` | `false` / `true` / `true` |
| `bookPathOpen` mit `status: 'not_yet'` oder `null` | `false` |
| `bookPathOpen` mit `bookBlocked`, `crisisNow`, `ownThreadHigh` oder `lastThreadHigh` | jeweils `false` |
| `eligiblePassages(alle, 'read', null)` | alle aktiven, freigegebenen inkl. Epilog und 🔒 |
| `eligiblePassages(alle, 'reading', 3)` | Positionen 0–3, keine 🔒 mit Position 3, kein Epilog |
| `eligiblePassages(alle, 'reading', 7)` | 0–7 ohne 🔒 aus Teil 7 (T7-D1 … T7-D6, T7-J2), mit T6-D1, kein Epilog |
| `eligiblePassages(alle, 'reading', 6)` | enthält DD-1, DD-2, DD-3 (Position 6), nicht T6-D1 (🔒, Position 6) |
| `eligiblePassages` mit `approved_by_jerome_at = null` oder `is_active = false` | Eintrag fehlt |
| `bookStep` Antwort 2, Verlauf 6, nie angeboten | `'none'` |
| `bookStep` Antwort 3, Verlauf 3 | `'none'` (zu wenig Verlauf) |
| `bookStep` Antwort 3, Verlauf 4, keine Kollision | `'check'` |
| `bookStep` Antwort 6, Kollision | `'check_skip'` |
| `bookStep` angeboten in 3, Antwort 4 / 5 / 6 | `'window'` / `'window'` / `'none'` |
| `bookStep` angeboten in 3, Antwort 4, Kollision | `'window_skip'` |
| `bookStep` angeboten in 3, Antwort 9 | `'none'` (kein zweites Fenster) |
| `parseSelection('{"ids":["T3-D1"]}', {T3-D1})` | `ok`, `['T3-D1']` |
| `parseSelection` mit Fence, Duplikaten, drei Kennungen | `ok`, höchstens 2, ohne Duplikate |
| `parseSelection('{"ids":["X-9"]}', …)` | `invalid_ids` |
| `parseSelection('Ich denke T3-D1')` | `parse` |
| `buildSelectionIndex` mit ⚠-Eintrag | Zeile enthält `[SENSIBEL` und die Themen, **keinen** Kernsatz |
| `buildBookBlock` mit 🔒 und ⚠ | enthält Auflösungs-Satz und `SONDERREGEL` |
| `buildBookBlock` mit `reading`, N = 4 | enthält „liest gerade Teil 4“ |
| `buildBookBlock` mit `windowReply: 2` | enthält den Satz zur vorigen Antwort |

### 6.2 Seed-Skript

- Lauf gegen die Landkarte liefert 58 Einträge und alle Pflichtprüfungen grün.
- Stichprobe im Test: `T4-D2.key_quote` = `Ich bin nur was wert, wenn ich’s draufhab` (ohne äußere Zeichen), `T1-D1.bridge_question` enthält „Danach:“, `T5-D2.is_sensitive = true`, `T7-D5.is_resolution = true`, `DD-1.position = 6`, `EP-3.part_title = 'Epilog'`.
- Eine absichtlich kaputte Kopie (ein Eintrag ohne Kernsatz) bricht mit Fehler ab.

### 6.3 `attack-test.mjs` (Kennungen statt Nummern)

| Kennung | Prüfung | Erwartung |
|---|---|---|
| **B1-a** | `GET /book_passages` als anon und als authenticated | Fehler oder 0 Zeilen, keine Buchtexte |
| **B1-b** | `POST /book_passages` als authenticated | Fehler |
| **B1-c** | Nutzer A: `PATCH /conversations?id=eq.<eigenes>` mit `book_blocked=false`, `book_offered_reply=null`, `book_passage_ids` | Schutz-Trigger greift wie bei den anderen Server-Spalten |
| **B1-d** | `rpc/get_book_hints` als anon | Fehler |
| **B1-e** | Nutzer mit `not_yet` bzw. ohne Status: `get_book_hints('uebernahme_reflex')` | leer |
| **B1-f** | Nutzer mit `reading`/2: `get_book_hints('uebernahme_reflex')` | genau T2-J (nichts aus Teil 3 oder später), kein ⚠ |
| **B1-g** | Nutzer mit `read`: `get_book_hints('rueckzug_unter_druck')` | genau T2-D3 und T3-D3 (die zwei frühesten Fundstellen), kein ⚠ |
| **B1-h** | `get_book_hints("x'; drop table …")` und `get_book_hints('')` | leer, keine Fehlermeldung mit Details |

---

### ⛔ STOPP J-B2: Szenario-Test im Modus `admin`

> 👤 **Jerome:** Mergen, Migrationen anwenden, `BOOK_REFERENCES_MODE=admin` setzen, Deploy abwarten. Mit deinem Admin-Konto auf dem Handy:
> 1. **Passt deutlich:** Buch-Status „gelesen“. Gespräch über einen Chef, dessen Bemerkung dich den ganzen Tag ärgert, obwohl Kollegen gelassen waren. Erwartung: Spätestens um die 3.–6. Antwort fragt der Coach, ob dich das an Tim und Mara erinnert. Erst auf ein „Nein, welche?“ beschreibt er die Szene kurz. Danach geht es wieder um dich. Nur einmal im Gespräch.
> 2. **Passt nicht:** Gespräch über ein Thema ohne Bezug (z. B. Umzugsplanung). Erwartung: kein Buch.
> 3. **Lesestand:** Status „Ich lese gerade, Teil 2“. Gespräch über ungefragte Hilfe für den Partner (Teil 3). Erwartung: keine Stelle aus Teil 3 oder später.
> 4. **Wellness:** Gespräch mit Wellness-Start und Wert ≤ 3, später passendes Thema. Erwartung: kein Buch im ganzen Gespräch.
> 5. **Sensibel:** Du erzählst selbst von Angst, die aus dem Nichts kommt. Erwartung: Wenn überhaupt, nur die Kernaussage, keine Details aus Jeromes Geschichte, keine Diagnose-Parallele.
> 6. **Neugier:** Mitten im Fenster: „Erzähl mir, wie das Buch ausgeht.“ Erwartung: „Das liest du am besten selbst. Hier geht es um dich.“
> 7. **Nicht-Leser:** Status „Noch nicht“, Frage „Gibt es zu der App ein Buch?“. Erwartung: kein Inhalt, Verweis auf „Das Buch zur App“ im Profil.
> 8. **Spiegel:** Muster-Detail `uebernahme_reflex` mit „gelesen“ zeigt „Im Buch“ mit 2 Fundstellen ohne Zitat. Mit „Noch nicht“: kein Hinweis.
> 9. **Supabase:** `app_logs` zeigt `book_check`, `book_block_sent` mit Kennungen, keine Inhalte. Token-Log `chat_book_select` vorhanden.
> 10. Ein normales Gespräch mit einem Konto **ohne** Admin-Rechte: kein Buch, keine spürbare Verzögerung.

---

## 7. Abschluss

1. `npm test` (inkl. `bookSelection.test.ts` und Seed-Test), `npm run build`, `npm run security:test` alle PASS.
2. `ARCHITECTURE.md`: Tabelle `book_passages`, neue `conversations`-Spalten, RPC `get_book_hints`, Erweiterung Schutz-Trigger, BLOCK 8 im Prompt-Aufbau, Auswahlschritt mit Haiku, Schalter `BOOK_REFERENCES_MODE`, Seed-Skript, Log-Codes.
3. `CLAUDE.md`: Hinweis, dass `book_passages` nur über das Seed-Skript gepflegt wird und die Landkarte im Repo das Repo privat hält.
4. Konzept „Buch zur App“: Abweichungen beim nächsten Update eintragen (Auswahl über Auswahlschritt statt Muster-Schlüssel, `book_offered_reply` statt `book_reference_used`, `coach_note`).
5. **Hinweis für Security-Paket V (Phase 0):** `get_book_hints` ist ein neuer Leseweg des Frontends und kann nach `my-data` wandern. `book_blocked`, `book_offered_reply` und `book_passage_ids` sind Kennungen bzw. Booleans wie `pattern_key` und bleiben unverschlüsselt. Migrationsnummern verschieben sich um zwei weitere (045, 046).
6. Abschlussbericht `docs/buch/b1-abschlussbericht.md` **und** im Chat: Status, Phase-0-Befunde, tatsächliche Migrationsnummern, Diff des Schutz-Triggers, geänderte Dateien, Testergebnisse, durchschnittliche Latenz und Tokens des Auswahlschritts aus dem Test, offene Fragen.

### ⛔ STOPP J-B3: Freischaltung und Abnahme

> 👤 **Jerome:**
> 1. Szenario-Test J-B2 vollständig, Abschlussbericht gelesen.
> 2. `BOOK_REFERENCES_MODE=all` setzen **und** `BOOK_REFERENCES_LIVE = true` im Frontend deployen (kleiner Commit, Claude Code bereitet ihn vor).
> 3. Nach einer Woche `app_logs` ansehen: Wie oft passt eine Stelle, welche Kennungen kommen vor, gibt es `book_select_failed`?

---

## 8. Definition of Done

- [ ] `book_passages` enthält die 58 freigegebenen Stellen, erzeugt per Skript aus der Landkarte, für Clients nicht lesbar.
- [ ] Buch-Bezüge gibt es nur für `read`/`reading`, nie über den Lesestand hinaus, 🔒 erst ab dem Folgeteil, Epilog nur bei `read`.
- [ ] Höchstens ein Buch-Fenster pro Gespräch (3 Antworten), Prüfung nur vor Antwort 3, 6 und 9 und ab 4 Nachrichten.
- [ ] Kein Buch bei Wellness ≤ 3 am Start, nach einem Krisenhinweis im Gespräch und bei `open_thread_intensity = 'high'`. Kein Buch im selben Turn wie Stimmen- oder Mechanismus-Block.
- [ ] Jeder Fehler im Buch-Pfad endet ohne Block und ohne Fehler im Gespräch.
- [ ] BLOCK 8 steht vor FORTSETZUNG/WEITERARBEITEN. BASE enthält die Zeile B1-1. Krisen- und Howto-Prompt unverändert.
- [ ] Keine Änderung an `post-conversation` und an der Lernbasis.
- [ ] Spiegel zeigt für Leser höchstens 2 Fundstellen ohne Zitat und ohne ⚠.
- [ ] Freischaltung in zwei Stufen (`admin`, dann `all` + Frontend-Schalter).
- [ ] Unit-Tests, Seed-Test und Angriffstests B1-a bis B1-h PASS. `ARCHITECTURE.md`, `CLAUDE.md` und Abschlussbericht aktualisiert.

---

*Handoff B1 Buch-Bezüge v1 · erstellt mit Claude für Jerome Houboi · friedensstifter.coach*
