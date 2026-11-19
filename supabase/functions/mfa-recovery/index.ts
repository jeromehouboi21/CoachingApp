// supabase/functions/mfa-recovery/index.ts — Zweiter Faktor für alle (S-06b, Paket C, Welle C-5)
//
// Aktionen (POST { action, … }):
//   codes:generate { afterEnroll? }  aal2 + verifizierter Faktor · 10 neue Codes, alte ungültig · 5/Tag
//   recover { code }                 auch mit aal1 (Code-Abfrage nicht möglich) · 5/Std + 10/Tag fail-closed
//                                    → Code verbraucht, ALLE Faktoren und restlichen Codes entfernt
//   disable                          aal2 · alle Faktoren und Codes entfernen
// Gespeichert wird nur HMAC-SHA-256(Code, MFA_CODE_PEPPER). Codes und Hashes werden nie geloggt.
// Mails ohne Inhalte aus dem Konto, an die E-Mail des Kontos.

import { createLogger, describeError } from '../_shared/logger.ts';
import { HttpError, assertAal2, requireUser, errorResponse, jsonResponse, readJsonBody, type AuthContext } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { enforceRateLimit, RateLimitError, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';
import { sendMail } from '../_shared/mailer.ts';

const CORS_HEADERS = corsHeaders('POST, OPTIONS');
const CODE_COUNT = 10;
// Base32 ohne verwechselbare Zeichen (0/O, 1/I); 32 Zeichen → x % 32 ohne Verzerrung
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// deno-lint-ignore no-explicit-any
type Logger = any;

function newCode(): string {
  const b = crypto.getRandomValues(new Uint8Array(10));
  const s = Array.from(b, (x) => ALPHABET[x % ALPHABET.length]).join('');
  return `${s.slice(0, 5)}-${s.slice(5)}`;
}

function normalize(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

async function hashCode(code: string): Promise<string> {
  const pepper = Deno.env.get('MFA_CODE_PEPPER') ?? '';
  if (pepper.length < 32) throw new HttpError(500, 'mfa_not_configured');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pepper),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(normalize(code)));
  return Array.from(new Uint8Array(sig), (x) => x.toString(16).padStart(2, '0')).join('');
}

const SIGNATURE = '\n\nWarst du das nicht? Antworte auf diese Mail, dann schauen wir gemeinsam darauf.\n\nFriedensstifter';
const MAILS = {
  enrolled: ['Zweiter Faktor eingerichtet',
    'Hallo,\n\nfür dein Friedensstifter-Konto wurde gerade ein zweiter Faktor eingerichtet. Nach der Anmeldung fragt die App jetzt zusätzlich nach einem Code aus deiner Authenticator-App.'],
  recovered: ['Wiederherstellungscode verwendet',
    'Hallo,\n\nfür dein Friedensstifter-Konto wurde gerade ein Wiederherstellungscode verwendet. Dein zweiter Faktor wurde dabei entfernt. Richte ihn am besten gleich im Profil neu ein.'],
  disabled: ['Zweiter Faktor entfernt',
    'Hallo,\n\nfür dein Friedensstifter-Konto wurde gerade der zweite Faktor entfernt. Die Anmeldung funktioniert jetzt wieder nur mit Passwort bzw. Anmeldelink.'],
} as const;

/** Mail im Hintergrund – die Antwort wartet nicht darauf. Nur Fehlercodes im Log. */
function notify(ctx: AuthContext, kind: keyof typeof MAILS, logger: Logger): void {
  const to = ctx.user.email;
  if (!to) return;
  const [subject, text] = MAILS[kind];
  const p = sendMail(to, subject, text + SIGNATURE)
    .then((r) => { if (!r.ok) logger.warn('mfa_mail_failed', { kind, code: r.code ?? 'unknown' }); })
    .catch((e) => logger.warn('mfa_mail_failed', { kind, ...describeError(e) }));
  // deno-lint-ignore no-explicit-any
  const runtime = (globalThis as any).EdgeRuntime;
  if (runtime?.waitUntil) runtime.waitUntil(p);
}

// deno-lint-ignore no-explicit-any
async function listFactors(ctx: AuthContext): Promise<any[]> {
  const { data, error } = await ctx.admin.auth.admin.mfa.listFactors({ userId: ctx.user.id });
  if (error) throw new HttpError(500, 'mfa_state_failed');
  return data?.factors ?? [];
}

/** Entfernt alle Faktoren (auch unbestätigte) und alle Codes. Kein stilles Scheitern. */
async function resetMfa(ctx: AuthContext, logger: Logger): Promise<number> {
  const factors = await listFactors(ctx);
  let failed = 0;
  for (const f of factors) {
    const { error } = await ctx.admin.auth.admin.mfa.deleteFactor({ id: f.id, userId: ctx.user.id });
    if (error) failed++;
  }
  const { error: codesError } = await ctx.admin.from('mfa_recovery_codes').delete().eq('user_id', ctx.user.id);
  if (failed > 0 || codesError) {
    logger.error('mfa_reset_failed', { factorsFailed: failed, codesFailed: !!codesError });   // überwacht S-22
    throw new HttpError(500, 'mfa_reset_failed');
  }
  return factors.length;
}

async function generateCodes(ctx: AuthContext, body: Record<string, unknown>, logger: Logger): Promise<Response> {
  assertAal2(ctx);
  const verified = (await listFactors(ctx)).filter((f) => f.status === 'verified');
  if (verified.length === 0) throw new HttpError(409, 'no_factor');
  await enforceRateLimit(ctx.admin, ctx.user.id, RATE_LIMITS.mfaCodes, logger, false);

  const codes = Array.from({ length: CODE_COUNT }, newCode);
  const rows = await Promise.all(codes.map(async (c) => ({ user_id: ctx.user.id, code_hash: await hashCode(c) })));

  const { error: delError } = await ctx.admin.from('mfa_recovery_codes').delete().eq('user_id', ctx.user.id);
  if (delError) {
    logger.error('mfa_codes_failed', { step: 'delete', code: delError.code ?? null });
    throw new HttpError(500, 'mfa_codes_failed');
  }
  const { data, error } = await ctx.admin.from('mfa_recovery_codes').insert(rows).select('id');
  if (error || (data?.length ?? 0) !== CODE_COUNT) {
    logger.error('mfa_codes_failed', { step: 'insert', code: error?.code ?? 'row_count' });
    throw new HttpError(500, 'mfa_codes_failed');
  }
  logger.info('mfa_codes_generated', { count: CODE_COUNT, afterEnroll: body.afterEnroll === true });
  if (body.afterEnroll === true) notify(ctx, 'enrolled', logger);
  return jsonResponse({ codes }, { ...CORS_HEADERS, 'Cache-Control': 'no-store' });
}

async function recover(ctx: AuthContext, body: Record<string, unknown>, logger: Logger): Promise<Response> {
  await enforceRateLimit(ctx.admin, ctx.user.id, RATE_LIMITS.mfaRecover, logger, false);
  const raw = typeof body.code === 'string' ? body.code : '';
  if (raw.length > 40 || normalize(raw).length !== 10) {
    logger.warn('mfa_recovery_failed', { reason: 'format' });
    throw new HttpError(400, 'invalid_code');
  }
  const hash = await hashCode(raw);
  const { data: hit, error } = await ctx.admin.from('mfa_recovery_codes').select('id')
    .eq('user_id', ctx.user.id).eq('code_hash', hash).is('used_at', null).limit(1).maybeSingle();
  if (error) throw new HttpError(500, 'mfa_state_failed');
  if (!hit) {
    logger.warn('mfa_recovery_failed', { reason: 'no_match' });   // überwacht S-22
    throw new HttpError(400, 'invalid_code');
  }
  // Code verbrauchen (nur wenn noch unbenutzt – schützt gegen doppelte Einlösung)
  const { data: used, error: useError } = await ctx.admin.from('mfa_recovery_codes')
    .update({ used_at: new Date().toISOString() }).eq('id', hit.id).is('used_at', null).select('id');
  if (useError) throw new HttpError(500, 'mfa_state_failed');
  if (!used?.length) {
    logger.warn('mfa_recovery_failed', { reason: 'race' });
    throw new HttpError(400, 'invalid_code');
  }
  const removed = await resetMfa(ctx, logger);
  logger.warn('mfa_recovery_used', { factorsRemoved: removed });   // überwacht S-22
  notify(ctx, 'recovered', logger);
  return jsonResponse({ ok: true }, CORS_HEADERS);
}

async function disable(ctx: AuthContext, logger: Logger): Promise<Response> {
  assertAal2(ctx);
  const removed = await resetMfa(ctx, logger);
  logger.info('mfa_disabled', { factorsRemoved: removed });
  if (removed > 0) notify(ctx, 'disabled', logger);
  return jsonResponse({ ok: true }, CORS_HEADERS);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });

  let logger = createLogger('mfa-recovery');
  try {
    // aal1 ist hier grundsätzlich zugelassen, weil recover genau dann gebraucht wird.
    // codes:generate und disable verlangen danach ausdrücklich aal2 (assertAal2).
    const ctx = await requireUser(req, { allowAal1: true });
    logger = createLogger('mfa-recovery', undefined, ctx.user.id);
    if (req.method !== 'POST') throw new HttpError(405, 'method_not_allowed');
    const body = await readJsonBody(req, 2048);

    switch (body.action) {
      case 'codes:generate': return await generateCodes(ctx, body, logger);
      case 'recover':        return await recover(ctx, body, logger);
      case 'disable':        return await disable(ctx, logger);
      default:               throw new HttpError(400, 'invalid_action');
    }
  } catch (error: unknown) {
    if (error instanceof RateLimitError) return rateLimitResponse(error, CORS_HEADERS);
    if (error instanceof HttpError) {
      if (error.status >= 500) logger.error('Request failed', { code: error.code, status: error.status });
      return errorResponse(error, CORS_HEADERS);
    }
    logger.error('mfa-recovery error', describeError(error));
    return errorResponse(error, CORS_HEADERS);
  }
});
