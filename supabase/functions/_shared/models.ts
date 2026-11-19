// supabase/functions/_shared/models.ts — einzige Stelle für Modell-IDs und modellbezogene Defaults (T0)
//
// Nach Retirement-Ankündigungen hier ändern, nirgends sonst. Kein Modellname als String
// in anderen Dateien (CLAUDE.md, „Technische Regeln“).

import type Anthropic from 'npm:@anthropic-ai/sdk@1.10.0';
import type { Logger } from './logger.ts';

// ── Coach (Sonnet) ───────────────────────────────────────────────────────────
export const COACH_MODEL = 'claude-sonnet-5-5';

// Sonnet 5.5 denkt adaptiv, wenn `thinking` fehlt. Der Coach soll ohne Vorab-Denken antworten
// (kurz, präsent, schnell) – wie bisher auf 4.5.
// ACHTUNG: { type: 'disabled' } gibt auf 5.5 einen 400. 'between_tools' ist der dokumentierte Weg,
// erlaubt nur effort low|medium|high und KEIN weiteres Feld in `thinking`. Das Feld gibt es nur
// auf Sonnet 5.5 – wer denselben Body an ein anderes Modell schickt, muss es vorher entfernen.
// effort darf sich innerhalb eines Gesprächs nicht ändern → konstant (Entscheidung E-1/E-16: medium).
// SDK 1.10.0 kennt beide Felder (kein SDK-Update nötig, Handoff T0 Schritt 7).
export const COACH_REQUEST_DEFAULTS: Pick<Anthropic.MessageCreateParams, 'thinking' | 'output_config'> = {
  thinking: { type: 'between_tools' },
  output_config: { effort: 'medium' },
};

// Neuer Tokenizer (ca. +30 % Tokens) → bisherige Werte × 1,4.
export const COACH_MAX_TOKENS = 560;          // vorher 400
export const COACH_CRISIS_MAX_TOKENS = 980;   // vorher 700 – der Pflichttext darf nicht abgeschnitten werden

// ── Haiku (Nachbearbeitung, Klassifikation) ─────────────────────────────────
// Bleibt in T0 unverändert (Status: Active). Wechsel auf Haiku 5.5 ist Tranche O1.
export const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

// ── Antwortinhalte ───────────────────────────────────────────────────────────
type ContentBlockLike = { type: string; text?: string };

/**
 * Zusammengefügter Text aller text-Blöcke – nie per Position lesen (`content[0]`), weil neuere
 * Modelle andere Blöcke (z. B. thinking) voranstellen können. Leer → warn mit den Blocktypen.
 */
export function extractText(
  response: { content?: ContentBlockLike[] } | null | undefined,
  label: string,
  logger?: Pick<Logger, 'warn'>,
): string {
  const blocks = response?.content ?? [];
  const text = blocks
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text as string)
    .join('');
  if (!text) logger?.warn('empty_text_response', { label, blockTypes: blocks.map((b) => b.type) });
  return text;
}

// ── Gesprächsende ────────────────────────────────────────────────────────────
type ApiMessage = { role: 'user' | 'assistant'; content: string };

/**
 * Sonnet 5.5 verlangt, dass die Unterhaltung mit einer Nutzernachricht endet (kein Prefill).
 * Endet sie auf 'assistant' (Coach spricht zuerst / Fortsetzen nach Coach-Antwort), wird ein
 * synthetischer, NICHT gespeicherter Nutzer-Turn angehängt. Er wird nie in `messages` geschrieben
 * und nie im Frontend angezeigt.
 */
export function ensureEndsWithUser<T extends ApiMessage>(
  msgs: T[], label: string, logger?: Pick<Logger, 'info'>, hint?: string,
): ApiMessage[] {
  if (msgs.length > 0 && msgs[msgs.length - 1].role === 'user') return msgs;
  logger?.info('synthetic_user_turn_added', { label, length: msgs.length });
  return [
    ...msgs,
    { role: 'user', content: hint ?? '[Hinweis: Der Nutzer hat das Gespräch geöffnet und noch nichts geschrieben. Beginne gemäß deiner Anweisungen.]' },
  ];
}
