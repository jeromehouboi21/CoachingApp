// supabase/functions/_shared/rateLimit.ts
// Rate-Limits pro Nutzer (Migration 029, RPC consume_rate_limits, nur service_role).
// Alle Grenzwerte stehen hier an einer Stelle.

import { HttpError } from './auth.ts';

// deno-lint-ignore no-explicit-any
type AdminClient = any;
// deno-lint-ignore no-explicit-any
type Logger = any;

export interface RateRule { bucket: string; limit: number; window_seconds: number }

const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;

export const RATE_LIMITS = {
  // Gesprächsmodus inkl. Eröffnungen (Wellness, Briefing, Entry-Kontext)
  chat:          [{ bucket: 'chat_min', limit: 10, window_seconds: MINUTE },
                  { bucket: 'chat_day', limit: 200, window_seconds: DAY }],
  howto:         [{ bucket: 'howto_hour', limit: 30, window_seconds: HOUR }],
  extract:       [{ bucket: 'extract_day', limit: 30, window_seconds: DAY }],
  postConversation: [{ bucket: 'post_conv_day', limit: 60, window_seconds: DAY }],
  // Schutz gegen Durchprobieren von Codes
  inviteCode:    [{ bucket: 'invite_hour', limit: 5, window_seconds: HOUR },
                  { bucket: 'invite_day', limit: 10, window_seconds: DAY }],
  // Datenexport (S-16), fail-closed
  export:        [{ bucket: 'export_day', limit: 3, window_seconds: DAY }],
  // Zweiter Faktor (S-06b), beide fail-closed
  mfaCodes:      [{ bucket: 'mfa_codes_day', limit: 5, window_seconds: DAY }],
  mfaRecover:    [{ bucket: 'mfa_recover_hour', limit: 5, window_seconds: HOUR },
                  { bucket: 'mfa_recover_day', limit: 10, window_seconds: DAY }],
  // Stripe Checkout (Gerüst, PAYMENTS_ENABLED), fail-closed
  checkout:      [{ bucket: 'checkout_hour', limit: 10, window_seconds: HOUR }],
} satisfies Record<string, RateRule[]>;

export class RateLimitError extends HttpError {
  retryAfter: number;
  bucket: string;
  constructor(bucket: string, retryAfter: number) {
    super(429, 'rate_limited');
    this.bucket = bucket;
    this.retryAfter = retryAfter;
  }
}

/**
 * Zählt die Anfrage und wirft RateLimitError (429), wenn eine Regel überschritten ist.
 * failOpen = true: Bei einem DB-Fehler läuft die Anfrage weiter (protokolliert als error).
 * failOpen = false: Bei einem DB-Fehler wird abgelehnt (500 rate_limit_unavailable).
 */
export async function enforceRateLimit(
  admin: AdminClient, userId: string, rules: RateRule[], logger: Logger, failOpen: boolean,
): Promise<void> {
  const { data, error } = await admin.rpc('consume_rate_limits', { p_user_id: userId, p_rules: rules });
  if (error) {
    logger.error('rate_limit_db_error', { code: error.code, failOpen });   // Code überwacht S-22
    if (failOpen) return;
    throw new HttpError(500, 'rate_limit_unavailable');
  }
  if (data && typeof data === 'object' && data.bucket) {
    const retryAfter = Number(data.retry_after) || 60;
    logger.warn('Rate limit exceeded', { bucket: data.bucket, retryAfter });
    throw new RateLimitError(String(data.bucket), retryAfter);
  }
}

/** 429-Antwort mit Retry-After-Header; Body nur Code + Wartezeit. */
export function rateLimitResponse(e: RateLimitError, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: 'rate_limited', retryAfter: e.retryAfter }), {
    status: 429,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Retry-After': String(e.retryAfter),
      'Access-Control-Expose-Headers': 'Retry-After',
    },
  });
}
