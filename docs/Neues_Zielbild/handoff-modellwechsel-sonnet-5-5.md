# Handoff: Modellwechsel Claude Sonnet 4.5 → Sonnet 5.5

**Für:** Claude Code
**Priorität:** kritisch, mit harter Frist
**Frist:** Deploy und Verifikation **vor dem 30.11.2026**. An diesem Tag schaltet Anthropic `claude-sonnet-4-5-20250929` und den Alias `claude-sonnet-4-5` ab. Danach schlagen alle Anfragen daran fehl, und der Coach antwortet nicht mehr.
**Reihenfolge:** **vor** Security-Paket C (C-1 berührt dieselben Edge Functions). Eigener Commit, eigener Deploy. Falls C-1 schon begonnen hat: dieses Paket zuerst mergen, C-1 darauf aufsetzen.
**Stand:** 19.11.2026, erstellt aus Anthropics offiziellem Migrationsleitfaden und dem Designdokument v3.1 plus Umsetzungsstand Security (S-12: Server lädt den Gesprächskontext selbst).

> **Wichtig:** Die BEFORE-Blöcke unten zeigen die *erwartete* Form laut Designdokument. Der echte Code hat sich seitdem verändert (Paket A/B, S-12). Jede Stelle **zuerst im Code finden und verifizieren**, dann ändern. Ein Patch gilt erst als umgesetzt, wenn er gegen den tatsächlichen Code geprüft ist (Lehre aus v3.1).

---

## 0. Fakten aus der offiziellen Dokumentation

Quelle: https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide · https://platform.claude.com/docs/en/about-claude/model-deprecations

| Thema | Sonnet 4.5 (heute) | Sonnet 5.5 (neu) | Folge für Friedensstifter |
|---|---|---|---|
| Model-ID | `claude-sonnet-4-5` | `claude-sonnet-5-5` | ersetzen |
| Thinking ohne `thinking`-Feld | kein Thinking | **adaptives Thinking an** | explizit abschalten (siehe 2), sonst werden Antworten länger, langsamer und teurer, und `max_tokens` wird vom Thinking aufgefressen |
| Thinking abschalten | `thinking` weglassen | `thinking: { type: "between_tools" }` + `output_config: { effort: "low" \| "medium" \| "high" }` | **Nicht** `thinking: { type: "disabled" }` senden, das gibt auf 5.5 einen 400 |
| Effort | gibt es nicht | `output_config.effort` setzen; darf sich innerhalb eines Gesprächs nicht ändern | konstant pro Function |
| `temperature`, `top_p`, `top_k` | erlaubt | **400-Fehler** | entfernen |
| Assistant-Prefill (letzte Nachricht vom Assistenten) | erlaubt | **400:** „The conversation must end with a user message." | Guard einbauen (siehe 5). Betrifft Coach-spricht-zuerst-Wege und Fortsetzen nach Coach-Nachricht |
| Tokenizer | – | **ca. 30 % mehr Tokens** für denselben Text | `max_tokens` anheben, Kosten neu messen |
| `max_tokens` | nur Text | Thinking + Text (bei `between_tools` ohne Tools praktisch nur Text) | anheben (siehe 3) |
| Antwort-Inhalte | meist `content[0]` = Text | Content-Blöcke **nach `type`** lesen | `content[0].text` ersetzen (siehe 4) |
| Preis | 3 $ / 15 $ pro MTok | 2 $ / 10 $ pro MTok | netto ca. 13 % günstiger (wegen +30 % Tokens) |

**Nicht in diesem Paket:**
- **Haiku** (`claude-haiku-4-5-20251001`) ist laut Deprecations-Seite weiter *Active* und bleibt unverändert. Der Wechsel auf Haiku 5.5 ist ein eigenes, späteres Paket, mit demselben Risiko bei `content[0]`.
- Prompt-Caching (Kostenoptimierung), später.
- Alles aus Paket C.

---

## Schritt 1 – Inventur (vor jeder Änderung, Ergebnis an Jerome)

```bash
# Alle Modell-IDs
rg -n "claude-(sonnet|haiku|opus)" supabase/functions src

# Parameter, die auf 5.5 einen 400 auslösen oder sich ändern
rg -n "temperature|top_p|top_k|budget_tokens|thinking|output_format|anthropic-beta|tool_choice" supabase/functions

# Stellen, die Antwortinhalte per Position lesen
rg -n "content\[0\]" supabase/functions

# Stellen, an denen Nachrichten-Arrays für die API zusammengebaut werden
rg -n "messages\.(create|stream)" supabase/functions

# SDK-Version
rg -n "@anthropic-ai/sdk" supabase/functions
```

**Erwartete Sonnet-Aufrufer** (aus Designdokument und Umsetzungsstand, bitte bestätigen oder ergänzen):
- `chat/index.ts`: Coach-Gespräch, Streaming
- `chat/index.ts`: Erklärungs-Agent / Howto-Modus („Wie es funktioniert"), falls eigener Aufruf
- `supervision`: wöchentliches Protokoll (Cron)
- ggf. Extraktion (`extractMemory`), falls auf Sonnet statt Haiku

Ergebnis als kurze Tabelle (Datei · Zeile · Modell · Parameter · `content[0]` ja/nein) in den Commit-Text bzw. ans Ende dieses Dokuments unter „Inventur-Ergebnis".

---

## Schritt 2 – Zentrale Modellkonstanten

**NEU** `supabase/functions/_shared/models.ts`

```ts
// Einzige Stelle, an der Modell-IDs und modellbezogene Request-Defaults stehen.
// Nach Retirement-Ankündigungen hier ändern, nirgends sonst.

export const COACH_MODEL = 'claude-sonnet-5-5';

// Sonnet 5.5 denkt adaptiv, wenn `thinking` fehlt. Der Coach soll ohne
// Vorab-Denken antworten (kurz, präsent, schnell) — wie bisher auf 4.5.
// ACHTUNG: { type: 'disabled' } gibt auf 5.5 einen 400. 'between_tools'
// ist der dokumentierte Weg und erlaubt nur effort low|medium|high.
// effort darf sich innerhalb eines Gesprächs NICHT ändern → hier konstant.
export const COACH_REQUEST_DEFAULTS = {
  thinking: { type: 'between_tools' as const },
  output_config: { effort: 'medium' as const },   // Entscheidung E-1, siehe unten
};

// Haiku bleibt in diesem Paket unverändert (Status: Active).
export const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
```

**Entscheidung E-1 (Effort-Stufe für den Coach):** Start mit `medium`. Begründung: Der Coach antwortet laut System-Prompt in 2–3 Sätzen mit einer Frage, und `medium` hält Länge und Latenz nah am heutigen Verhalten. In der Validierung (Schritt 8) `medium` und `high` an denselben fünf Testeinstiegen vergleichen. Wechsel nur nach Jeromes Freigabe.

**BEFORE** (erwartete Form, `chat/index.ts`):

```ts
const stream = await anthropic.messages.stream({
  model: 'claude-sonnet-4-5',
  max_tokens: 400,
  system: buildSystemPrompt(/* … */),
  messages: apiMessages,
});
```

**AFTER:**

```ts
import { COACH_MODEL, COACH_REQUEST_DEFAULTS } from '../_shared/models.ts';

const stream = await anthropic.messages.stream({
  model: COACH_MODEL,
  max_tokens: COACH_MAX_TOKENS,          // Schritt 3
  ...COACH_REQUEST_DEFAULTS,
  system: buildSystemPrompt(/* … */),
  messages: ensureEndsWithUser(apiMessages, 'chat'),   // Schritt 5
});
```

Gleiches Muster für **alle** in Schritt 1 gefundenen Sonnet-Aufrufer (Howto, Supervision usw.). Jeder bekommt `COACH_MODEL` + `COACH_REQUEST_DEFAULTS` (oder eine eigene, ebenfalls konstante Effort-Stufe, z. B. `high` für Supervision) + `ensureEndsWithUser`.

---

## Schritt 3 – `max_tokens` anheben, Abschneiden sichtbar machen

Der Tokenizer erzeugt ca. 30 % mehr Tokens. Bei unverändertem `max_tokens: 400` würden Coach-Antworten häufiger mitten im Satz enden.

```ts
// _shared/models.ts
export const COACH_MAX_TOKENS = 560;   // 400 × 1,4 (Tokenizer + Puffer)
```

Andere Sonnet-Aufrufer: bisherigen Wert × 1,4, aufgerundet.

**Abschneiden darf nicht still passieren** (Engineering-Regel „Silent failure"):
- Streaming: `stop_reason` aus dem `message_delta`-Event auslesen bzw. nach Stream-Ende `await stream.finalMessage()`.
- Bei `stop_reason === 'max_tokens'` einen `logger.warn('coach_response_truncated', { conversationId, outputTokens })` schreiben. Nur Zahlen, keine Inhalte (S-04).
- Bei `stop_reason === 'refusal'` oder anderen unerwarteten Werten ebenfalls loggen.

---

## Schritt 4 – Antwortinhalte nach `type` lesen

**NEU** in `_shared/models.ts` (oder `_shared/anthropic.ts`):

```ts
/** Liefert den zusammengefügten Text aller text-Blöcke. Leer → loggt warn. */
export function extractText(response: { content: Array<{ type: string; text?: string }> }, label: string, logger?: { warn: Function }): string {
  const text = response.content
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('');
  if (!text && logger) logger.warn('empty_text_response', { label, blockTypes: response.content.map((b) => b.type) });
  return text;
}
```

**BEFORE** (erwartete Form, z. B. `runPrompt` in `post-conversation`, Extraktion, Supervision):

```ts
const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';
```

**AFTER:**

```ts
const raw = extractText(response, label, logger) || '{}';
```

Auch auf die Haiku-Aufrufe anwenden. Heute schadet es dort nicht, und beim späteren Haiku-Wechsel verhindert es, dass die ganze Lern-Pipeline still leere Objekte schreibt.

**Streaming-Schleife** im Coach: Laut Designdokument werden schon nur `content_block_delta` mit `delta.type === 'text_delta'` weitergereicht. Das bitte verifizieren. Mit `between_tools` und ohne Tools sollten keine Thinking-Blöcke entstehen. Falls doch, werden sie durch diese Filterung ignoriert. Das ist gewollt.

---

## Schritt 5 – Gespräch endet immer mit einer Nutzernachricht

Sonnet 5.5 lehnt jede Anfrage ab, deren letzte Nachricht vom Assistenten stammt („Prefill"). Seit S-12 baut der Server den Verlauf aus `messages` selbst zusammen. Genau dort entsteht das Risiko.

**Betroffene Wege** (alle prüfen):
1. **Coach spricht zuerst:** Wiederkehr-Begrüßung, Entry-Kontext-Starts (Tagesimpuls, Muster, Spiegel), Wellness-Start. Prüfen, wie diese heute ausgelöst werden: mit synthetischer Nutzernachricht, oder mit leerem bzw. auf Assistent endendem Array?
2. **Fortsetzen eines alten Gesprächs**, dessen letzte gespeicherte Nachricht vom Coach ist, wenn der Coach dann erneut zuerst sprechen soll. Das ist künftig auch der Weg „Daran weiterarbeiten" aus dem UX-Konzept.
3. Jeder Fall, in dem ein Aufruf bewusst mit einer Assistant-Nachricht endet (z. B. JSON-Prefill `"{"`). Laut Inventur prüfen.

**NEU** `_shared/models.ts`:

```ts
type ApiMessage = { role: 'user' | 'assistant'; content: string };

/**
 * Sonnet 5.5 verlangt, dass die Unterhaltung mit einer Nutzernachricht endet.
 * Endet sie auf 'assistant' (Coach spricht zuerst / Fortsetzen nach Coach-Antwort),
 * wird ein synthetischer, NICHT persistierter Nutzer-Turn angehängt.
 * Der Text ist bewusst neutral und für das Modell als Systemhinweis erkennbar.
 */
export function ensureEndsWithUser(msgs: ApiMessage[], label: string, logger?: { info: Function }): ApiMessage[] {
  if (msgs.length > 0 && msgs[msgs.length - 1].role === 'user') return msgs;
  logger?.info('synthetic_user_turn_added', { label, length: msgs.length });
  return [
    ...msgs,
    { role: 'user', content: '[Hinweis: Der Nutzer hat das Gespräch geöffnet und noch nichts geschrieben. Beginne gemäß deiner Anweisungen.]' },
  ];
}
```

**Regeln:**
- Der synthetische Turn wird **nie** in `messages` gespeichert und nie im Frontend angezeigt.
- Wenn es heute schon einen synthetischen Start-Turn gibt, diesen beibehalten und den Guard trotzdem davor schalten (doppelte Sicherheit, kein doppelter Turn: Der Guard greift nur, wenn das Array auf `assistant` endet).
- Echter Prefill (falls in der Inventur gefunden) wird ersetzt: Formatvorgaben gehören in den System-Prompt, und die JSON-Ausgabe wird über `extractText` + Codefence-Bereinigung geparst (bestehende Logik in `runPrompt`).
- Prüfen, ob die API weiterhin verlangt, dass die **erste** Nachricht vom Nutzer stammt (Coach-Begrüßung als erster gespeicherter Eintrag). Falls ein Test mit 400 scheitert: analog einen synthetischen ersten Nutzer-Turn voranstellen. Bisheriges Verhalten auf 4.5 als Referenz nehmen.

---

## Schritt 6 – Parameter und Header bereinigen

Laut Inventur (Schritt 1):
- `temperature`, `top_p`, `top_k` aus allen **Sonnet**-Aufrufen entfernen. Bei Haiku vorerst lassen, Haiku 4.5 akzeptiert sie noch.
- Beta-Header `interleaved-thinking-2025-05-14` und Kontextfenster-Beta-Header entfernen, falls vorhanden.
- `output_format` → `output_config.format`, falls vorhanden.
- `tool_choice` `any`/`tool` → `auto`, falls vorhanden (laut Designdokument werden keine Tools genutzt).

---

## Schritt 7 – SDK-Version

- Import-Version von `npm:@anthropic-ai/sdk` prüfen (in allen Functions bzw. `deno.json`/Import-Map).
- Auf eine aktuelle Version anheben, die `output_config` und `thinking: { type: 'between_tools' }` kennt. Alle Functions auf dieselbe Version setzen.
- Falls die TypeScript-Typen der verwendeten Version die Felder noch nicht kennen: **nur** in `_shared/models.ts` typisieren bzw. casten, nicht verstreut mit `as any` an jedem Aufruf.

---

## Schritt 8 – Token-Logging für die Kostenbasis

Für die Preisentscheidung (UX-Konzept 5.2a) braucht Jerome echte Zahlen. Nach jedem Coach-Aufruf:

```ts
logger.info('coach_usage', {
  conversationId,
  model: COACH_MODEL,
  inputTokens: usage.input_tokens,
  outputTokens: usage.output_tokens,
  cacheReadTokens: usage.cache_read_input_tokens ?? 0,
  stopReason,
});
```

Nur Zahlen und IDs, keine Inhalte (S-04, `sanitizeLogData` greift zusätzlich). Dazu eine Auswerte-Abfrage:

```sql
-- Kosten je Gespräch der letzten 14 Tage (Sonnet 5.5: 2 $ / 10 $ pro MTok)
select
  metadata->>'conversationId'                                   as conversation_id,
  count(*)                                                      as coach_calls,
  sum((metadata->>'inputTokens')::int)                          as input_tokens,
  sum((metadata->>'outputTokens')::int)                         as output_tokens,
  round(( sum((metadata->>'inputTokens')::int)  * 2.0
        + sum((metadata->>'outputTokens')::int) * 10.0) / 1e6, 4) as est_usd
from app_logs
where source = 'chat' and message = 'coach_usage'
  and created_at > now() - interval '14 days'
group by 1
order by est_usd desc;
```

Hinweis: Der 30-Tage-Löschjob (Migration 026) räumt diese Logs automatisch auf. Für die Preisentscheidung reicht das.

---

## Schritt 9 – Validierung (Jerome, mit Testkonto, keine Echtdaten, S-17)

**Vor dem Deploy (Claude Code):**
- [ ] Inventur-Tabelle vollständig, kein Treffer `claude-sonnet-4-5` mehr in `supabase/functions` und `src`
- [ ] Kein `temperature`/`top_p`/`top_k` mehr in Sonnet-Aufrufen
- [ ] Kein `content[0]` mehr in Functions, die Modellantworten lesen
- [ ] `ensureEndsWithUser` vor jedem Sonnet-Aufruf
- [ ] `npm run security:test` (Angriffstest) weiterhin alles PASS

**Nach dem Deploy (Jerome, Testkonto):**
- [ ] **Normales Gespräch:** 5–6 Nachrichten. Antworten kommen gestreamt, 2–3 Sätze plus eine Frage, keine abgeschnittenen Sätze
- [ ] **Coach spricht zuerst:** Tagesimpuls → „Darüber reden". Erste Nachricht kommt ohne Fehler
- [ ] **Wellness-Start:** Wie geht's dir? → Gespräch beginnen. Erste Nachricht kommt
- [ ] **Fortsetzen:** altes Gespräch, dessen letzte Nachricht vom Coach ist, über den Verlauf öffnen und weiterschreiben. Kein Fehler
- [ ] **Wiederkehr-Begrüßung**, falls auslösbar (offener Faden, ≥ 2 Tage). Sonst Weg 1 als Ersatz
- [ ] **Howto-Agent** („Wie es funktioniert"): eine Frage stellen, Antwort kommt
- [ ] **Nachbearbeitung:** Nach dem Testgespräch die App schließen. In `app_logs` stehen `post-conversation | Started` und `Completed`, und `session_notes`/`insights` für das Testgespräch sind befüllt (Haiku unverändert, aber `extractText` neu)
- [ ] **Supervision**, falls manuell intern auslösbar: läuft ohne 400
- [ ] **`app_logs` prüfen:** kein `invalid_request_error`, kein `coach_response_truncated`, `coach_usage`-Einträge vorhanden
- [ ] **Sprachprinzip:** In 10 Coach-Antworten kein „müssen", kein absolutes „immer" oder „nie" (neues Modell, gleicher Prompt, kurz gegenlesen)
- [ ] **E-1:** fünf gleiche Einstiege mit `medium` und `high` vergleichen (Länge, Ton, Latenz), Entscheidung festhalten

**Rollback:** Bis zum 30.11. ist ein Zurückdrehen nur über `COACH_MODEL = 'claude-sonnet-4-5'` möglich, und `COACH_REQUEST_DEFAULTS` muss dann leer sein, weil 4.5 `output_config` nicht kennt. Nach dem 30.11. gibt es kein Rollback mehr, Fehler werden vorwärts behoben. Deshalb so früh wie möglich deployen.

---

## Schritt 10 – Nach erfolgreicher Validierung

- Designdokument: Abschnitt 2.3 (Modell) und Code in Abschnitt 6 auf `claude-sonnet-5-5` + `_shared/models.ts` aktualisieren (geht in v3.2/v3.3 ein).
- `ARCHITECTURE.md`: Regel ergänzen, dass Modell-IDs ausschließlich in `_shared/models.ts` stehen.
- Eigenes Folgepaket vormerken: **Haiku 4.5 → Haiku 5.5** (günstiger, aber gleicher Thinking-Default; `extractText` ist dann schon da) und **Prompt-Caching** des System-Prompts (Kosten etwa halbieren).

---

## Inventur-Ergebnis

*(von Claude Code nach Schritt 1 auszufüllen)*

Stand vor der Änderung (Branch `t0/modellwechsel-sonnet-5-5`, Basis `fe0b6dcb`):

| Datei | Zeile | Modell | Parameter (temp/top_p/thinking/…) | `content[0]` | endet ggf. auf assistant |
|---|---|---|---|---|---|
| `chat/index.ts` (Coach + Howto, Streaming) | 1044 / 1466 | `claude-sonnet-4-5` | keine; `max_tokens` 400 bzw. 700 (Krise) | nein (Stream filtert `text_delta`) | **ja**: Start `wellness`/`briefing`/`entry` auf einem Gespräch, dessen letzte Nachricht vom Coach ist. Leeres Gespräch → `toApiMessages` stellt `'.'` als Nutzer-Turn voran (bleibt) |
| `chat/index.ts` (Extraktion) | 1234 | Haiku 4.5 | keine; 600 | ja (1238) | nein |
| `chat/crisisDetection.ts` | 41 | Haiku 4.5 | keine; 200 | ja (48) | nein |
| `post-conversation/index.ts` (`runPrompt`) | 243 | Haiku 4.5 | keine; 2000 | ja (247) | nein |
| `supervision/index.ts` | 93 | Haiku 4.5 | keine; 500 | ja (98) | nein |
| `_shared/learning.ts` (`makeHaikuCaller`) | 86 | Haiku 4.5 | keine; 200 | ja (91) | nein |

- Kein `temperature`/`top_p`/`top_k`, kein `thinking`, kein Beta-Header, kein `tool_choice`, kein Prefill.
- Sonnet wird nur in `chat` aufgerufen (Coach und Howto, ein Aufruf). Supervision und Extraktion laufen auf Haiku.
- SDK überall `@anthropic-ai/sdk@1.10.0`; `chat/index.ts` lud es über `esm.sh`, jetzt wie alle anderen über `npm:`. 1.10.0 kennt `thinking: { type: 'between_tools' }` und `output_config` in den Typen → kein SDK-Update nötig.
- Abweichung vom Handoff: Der Krisenpfad hat eigenes `max_tokens` (700 → 980). `coach_usage` enthält zusätzlich `mode` (coaching/howto). Unerwartete Stop-Gründe (z. B. `refusal`) werden als `coach_response_unexpected_stop` geloggt; neue Codes stehen als `infoOnly` in `_shared/monitorRules.ts`.
- Typ-Check aller Functions mit `deno check` (Deno 2.5.6) ohne Fehler.
- Kostenabfrage: `supabase/diagnostics/coach-usage.sql`.
