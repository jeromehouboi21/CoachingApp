// supabase/functions/_shared/auth.ts
// Sicherheitsmuster v2 (Security-Paket A, S-03): Jede Edge Function bestimmt den
// Aufrufer ausschließlich aus dem JWT und prüft das Eigentum an jeder Objekt-ID.
// Body-Felder wie userId werden nie als Identität verwendet.

import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2.119.0';
import { createLogger } from './logger.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

export class HttpError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

export interface AuthContext {
  user: User;
  token: string;
  /** Echter service_role-Client OHNE Nutzer-Token – umgeht RLS. Nur für Daten, deren Eigentum vorher geprüft wurde. */
  admin: SupabaseClient;
  /** Client im Namen des Nutzers (Rolle authenticated) – RLS greift, auth.uid() ist gesetzt. */
  userClient: SupabaseClient;
}

function bearerToken(req: Request): string {
  const header = req.headers.get('Authorization') ?? '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

/** Service-role-Client ohne Nutzer-Token (für interne Functions wie supervision). */
export function createAdminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

/**
 * Prüft das JWT und liefert den Aufrufer.
 * S-06b (Paket C): Hat der Nutzer einen verifizierten zweiten Faktor, wird nur eine aal2-Sitzung
 * angenommen (403 mfa_required). allowAal1 setzt ausschließlich mfa-recovery (Wiederherstellung).
 */
export async function requireUser(req: Request, opts: { allowAal1?: boolean } = {}): Promise<AuthContext> {
  const token = bearerToken(req);
  if (!token) throw new HttpError(401, 'missing_token');

  const admin = createAdminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) throw new HttpError(401, 'invalid_token');
  const user = data.user;

  if (!opts.allowAal1 && readVerifiedClaims(token).aal !== 'aal2') {
    let factors = user.factors;
    if (!Array.isArray(factors)) {
      // GoTrue liefert factors sonst mit; Fallback über die Admin-API
      const { data: list, error: listError } = await admin.auth.admin.mfa.listFactors({ userId: user.id });
      if (listError) throw new HttpError(500, 'mfa_check_failed');
      factors = list?.factors ?? [];
    }
    if (factors.some((f) => f.status === 'verified')) {
      createLogger('auth', undefined, user.id).info('user_mfa_required');   // nicht 'mfa_required' (Admin-Alarm)
      throw new HttpError(403, 'mfa_required');
    }
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  return { user, token, admin, userClient };
}

/** Verlangt eine aal2-Sitzung, unabhängig davon, ob ein Faktor vorhanden ist (mfa-recovery). */
export function assertAal2(ctx: AuthContext): void {
  if (readVerifiedClaims(ctx.token).aal !== 'aal2') throw new HttpError(403, 'mfa_required');
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export async function assertConversationOwner(
  admin: SupabaseClient, conversationId: unknown, userId: string,
): Promise<string> {
  if (!isUuid(conversationId)) throw new HttpError(400, 'invalid_conversation_id');
  const { data, error } = await admin
    .from('conversations').select('id')
    .eq('id', conversationId).eq('user_id', userId)
    .maybeSingle();
  if (error) throw new HttpError(500, 'ownership_check_failed');
  if (!data) throw new HttpError(403, 'forbidden');
  return conversationId;
}

/** Prüft, ob der Aufrufer Admin ist (über den echten service_role-Client). */
/**
 * Liest Claims aus einem JWT, das requireUser bereits per admin.auth.getUser(token) geprüft hat.
 * Nur für geprüfte Tokens verwenden — nie für ungeprüfte.
 */
function readVerifiedClaims(token: string): Record<string, unknown> {
  const part = token.split('.')[1] ?? '';
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
  try {
    const parsed = JSON.parse(atob(b64));
    if (!parsed || typeof parsed !== 'object') throw new Error('not_object');
    return parsed as Record<string, unknown>;
  } catch {
    throw new HttpError(401, 'invalid_token');
  }
}

/** Admin = is_admin UND zweiter Faktor in dieser Sitzung (aal2, S-06). */
export async function requireAdmin(ctx: AuthContext): Promise<void> {
  const { data, error } = await ctx.admin
    .from('profiles').select('is_admin').eq('id', ctx.user.id).maybeSingle();
  if (error) throw new HttpError(500, 'admin_check_failed');
  if (!data?.is_admin) throw new HttpError(403, 'forbidden');

  const claims = readVerifiedClaims(ctx.token);
  if (claims.aal !== 'aal2') throw new HttpError(403, 'mfa_required');
}

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a), y = enc.encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

/** Für interne Aufrufe (Cron): nur mit Service-Key als Bearer oder Header x-cron-secret = CRON_SECRET. */
export function requireInternalCaller(req: Request): void {
  const token = bearerToken(req);
  const cronSecret = Deno.env.get('CRON_SECRET') ?? '';
  const cronHeader = req.headers.get('x-cron-secret') ?? '';
  const ok = (token !== '' && timingSafeEqual(token, SERVICE_ROLE_KEY))
    || (cronSecret.length >= 16 && cronHeader !== '' && timingSafeEqual(cronHeader, cronSecret));
  if (!ok) throw new HttpError(401, 'internal_only');
}

/**
 * Liest den Body als JSON mit Größenlimit (Bytes). 413 bei Überschreitung, 400 bei ungültigem JSON.
 * Die JSON.parse-Fehlermeldung wird bewusst verworfen (enthält Textausschnitte, siehe Log-Regel).
 */
export async function readJsonBody(req: Request, maxBytes: number): Promise<Record<string, unknown>> {
  const declared = Number(req.headers.get('content-length') ?? '0');
  if (declared > maxBytes) throw new HttpError(413, 'payload_too_large');
  const raw = await req.text();
  if (new TextEncoder().encode(raw).length > maxBytes) throw new HttpError(413, 'payload_too_large');
  if (!raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not_object');
    return parsed as Record<string, unknown>;
  } catch {
    throw new HttpError(400, 'invalid_json');
  }
}

/** Validiert ein messages-Array. Wirft 400 bei falscher Form, 413 bei zu großen Inhalten. */
export function validateMessages(
  messages: unknown, opts: { maxEntries: number; maxContentChars: number },
): { role: string; content: string }[] {
  if (messages === undefined || messages === null) return [];
  if (!Array.isArray(messages)) throw new HttpError(400, 'invalid_messages');
  if (messages.length > opts.maxEntries) throw new HttpError(413, 'too_many_messages');
  return messages.map((m) => {
    if (!m || typeof m !== 'object') throw new HttpError(400, 'invalid_messages');
    const { role, content } = m as Record<string, unknown>;
    if (role !== 'user' && role !== 'assistant') throw new HttpError(400, 'invalid_messages');
    if (typeof content !== 'string') throw new HttpError(400, 'invalid_messages');
    if (content.length > opts.maxContentChars) throw new HttpError(413, 'message_too_large');
    return { role, content };
  });
}

export function errorResponse(e: unknown, corsHeaders: Record<string, string>): Response {
  const status = e instanceof HttpError ? e.status : 500;
  const code = e instanceof HttpError ? e.code : 'internal_error';
  // S-22: abgelehnte Anfragen zählen (Alarm auth_rejected). Nur Status und Code – kein Body, keine Header.
  if (status === 401 || status === 403) createLogger('auth').warn('auth_rejected', { status, code });
  return new Response(JSON.stringify({ error: code }), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function jsonResponse(body: unknown, corsHeaders: Record<string, string>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
