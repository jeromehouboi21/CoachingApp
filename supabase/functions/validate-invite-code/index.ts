// supabase/functions/validate-invite-code/index.ts
// Validiert einen Einladungscode und löst ihn für den Nutzer ein.
// Verwendet service_role, da invite_codes keine SELECT-Policy für Nutzer hat und
// redeem_invite_code nur für service_role ausführbar ist.
// Sicherheitsmuster v2: Einlösung ausschließlich für user.id aus dem JWT.

import { createLogger, describeError } from '../_shared/logger.ts';
import { HttpError, requireUser, readJsonBody, errorResponse, jsonResponse } from '../_shared/auth.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_CODE_LENGTH = 64;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  let logger = createLogger('validate-invite-code');

  try {
    const { user, admin } = await requireUser(req);
    logger = createLogger('validate-invite-code', undefined, user.id);

    const body = await readJsonBody(req, 4 * 1024);
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    if (!code || code.length > MAX_CODE_LENGTH) {
      return jsonResponse({ ok: false, error: 'missing_code' }, CORS_HEADERS, 400);
    }

    // Atomar einlösen via RPC (SECURITY DEFINER)
    const { data, error } = await admin.rpc('redeem_invite_code', {
      p_code: code,
      p_user_id: user.id,
    });

    if (error) {
      logger.error('redeem_invite_code failed', { code: error.code });
      return jsonResponse({ ok: false, error: 'rpc_error' }, CORS_HEADERS, 500);
    }

    // Kein Code im Log (Geheimnis) — nur Ergebnis
    logger.info('Invite code checked', { ok: !!data?.ok, reason: data?.ok ? null : (data?.error ?? 'unknown') });
    return jsonResponse(data, CORS_HEADERS);

  } catch (error: unknown) {
    if (error instanceof HttpError) {
      if (error.status >= 500) logger.error('Request failed', { code: error.code, status: error.status });
      return errorResponse(error, CORS_HEADERS);
    }
    logger.error('Unhandled error', describeError(error));
    return errorResponse(error, CORS_HEADERS);
  }
});
