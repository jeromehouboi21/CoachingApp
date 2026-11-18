// supabase/functions/admin-invite-user/index.ts
// Admin lädt eine Person per E-Mail ein und vergibt direkt Beta-Rechte.
// Nutzt Supabase Auths eingebauten Invite-Mechanismus (Auth-Mail), kein
// eigener Mailversand nötig.
// Sicherheitsmuster v2: requireUser + requireAdmin. E-Mail-Adressen werden nicht geloggt.

import { createLogger, describeError } from '../_shared/logger.ts';
import { HttpError, requireUser, requireAdmin, readJsonBody, errorResponse, jsonResponse } from '../_shared/auth.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  let logger = createLogger('admin-invite-user');

  try {
    const ctx = await requireUser(req);
    logger = createLogger('admin-invite-user', undefined, ctx.user.id);
    try {
      await requireAdmin(ctx);
    } catch (e) {
      if (e instanceof HttpError && e.status === 403) logger.warn('Forbidden — non-admin attempted admin-invite-user');
      throw e;
    }
    const supabase = ctx.admin;

    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, CORS_HEADERS, 405);
    }

    const { email, displayName, sessionLimit } = await readJsonBody(req, 8 * 1024);

    if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
      return jsonResponse({ error: 'Ungültige E-Mail-Adresse' }, CORS_HEADERS, 400);
    }
    const normalizedEmail = email.trim().toLowerCase();
    const name = typeof displayName === 'string' && displayName.trim() ? displayName.trim().slice(0, 100) : null;
    const limit = sessionLimit === null || sessionLimit === undefined || sessionLimit === ''
      ? null
      : Number(sessionLimit);
    if (limit !== null && (!Number.isInteger(limit) || limit < 0)) {
      return jsonResponse({ error: 'Ungültiges Limit' }, CORS_HEADERS, 400);
    }

    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://app.friedensstifter.coach';

    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        redirectTo: `${siteUrl}/onboarding`,
        data: name ? { display_name: name } : undefined,
      }
    );

    if (inviteError) {
      const alreadyExists = /already.*registered|already.*exist/i.test(inviteError.message);
      logger.warn('invite failed', { ...describeError(inviteError), alreadyExists });
      return jsonResponse(
        {
          error: alreadyExists
            ? 'Diese E-Mail-Adresse ist bereits registriert.'
            : 'Einladung fehlgeschlagen.',
        },
        CORS_HEADERS,
        alreadyExists ? 409 : 500,
      );
    }

    const newUserId = inviteData.user.id;

    // Beta-Rechte direkt setzen. upsert statt insert/update, da ein DB-Trigger
    // möglicherweise schon parallel eine profiles-Zeile für den neuen
    // auth.users-Eintrag angelegt hat (bekanntes Race-Pattern in diesem Projekt).
    // Läuft als service_role → vom Profil-Schutz-Trigger (Migration 024) nicht betroffen.
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: newUserId,
          display_name: name,
          plan: 'tester',
          is_beta_tester: true,
          session_limit: limit,
          invited_at: new Date().toISOString(),
          invited_by: ctx.user.id,
        },
        { onConflict: 'id' }
      );

    if (profileError) {
      // Der Auth-Nutzer wurde bereits angelegt und die Mail bereits verschickt —
      // das lässt sich nicht mehr zurückrollen. Wir melden den Fehler klar,
      // damit der Beta-Status manuell im Nutzer-Tab nachgezogen werden kann.
      logger.error('profile upsert after invite failed', { code: profileError.code, newUserId });
      return jsonResponse(
        { error: 'Einladung verschickt, aber Beta-Rechte konnten nicht gesetzt werden. Bitte manuell im Nutzer-Tab nachpflegen.' },
        CORS_HEADERS,
        500,
      );
    }

    logger.info('Admin invited new beta user', { newUserId });
    return jsonResponse({ ok: true, userId: newUserId }, CORS_HEADERS);

  } catch (error: unknown) {
    if (error instanceof HttpError) {
      if (error.status >= 500) logger.error('Request failed', { code: error.code, status: error.status });
      return errorResponse(error, CORS_HEADERS);
    }
    logger.error('admin-invite-user failed', describeError(error));
    return errorResponse(error, CORS_HEADERS);
  }
});
