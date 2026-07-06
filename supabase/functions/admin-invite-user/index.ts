// supabase/functions/admin-invite-user/index.ts
// Admin lädt eine Person per E-Mail ein und vergibt direkt Beta-Rechte.
// Nutzt Supabase Auths eingebauten Invite-Mechanismus (Auth-Mail), kein
// eigener Mailversand nötig.

import { createClient } from 'npm:@supabase/supabase-js';
import { createLogger } from '../_shared/logger.ts';

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

  const logger = createLogger('admin-invite-user');

  // Gleiches Auth-Muster wie admin-users: Bearer-Token prüfen, dann
  // separat mit echtem Service-Role-Client arbeiten.
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  const callerClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } }
  );
  const { data: { user: caller }, error: authError } = await callerClient.auth.getUser(token);
  if (authError || !caller) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', caller.id)
    .single();

  if (!callerProfile?.is_admin) {
    logger.warn('Forbidden — non-admin attempted admin-invite-user', { userId: caller.id });
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  try {
    const { email, displayName, sessionLimit } = await req.json();

    if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
      return new Response(JSON.stringify({ error: 'Ungültige E-Mail-Adresse' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const limit = sessionLimit === null || sessionLimit === undefined || sessionLimit === ''
      ? null
      : Number(sessionLimit);
    if (limit !== null && (!Number.isFinite(limit) || limit < 0)) {
      return new Response(JSON.stringify({ error: 'Ungültiges Limit' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://app.friedensstifter.coach';

    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        redirectTo: `${siteUrl}/onboarding`,
        data: displayName ? { display_name: displayName } : undefined,
      }
    );

    if (inviteError) {
      const alreadyExists = /already.*registered|already.*exist/i.test(inviteError.message);
      logger.warn('invite failed', { error: inviteError.message, email: normalizedEmail });
      return new Response(
        JSON.stringify({
          error: alreadyExists
            ? 'Diese E-Mail-Adresse ist bereits registriert.'
            : inviteError.message,
        }),
        { status: alreadyExists ? 409 : 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const newUserId = inviteData.user.id;

    // Beta-Rechte direkt setzen. upsert statt insert/update, da ein DB-Trigger
    // möglicherweise schon parallel eine profiles-Zeile für den neuen
    // auth.users-Eintrag angelegt hat (bekanntes Race-Pattern in diesem Projekt).
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: newUserId,
          display_name: displayName || null,
          plan: 'tester',
          is_beta_tester: true,
          session_limit: limit,
          invited_at: new Date().toISOString(),
          invited_by: caller.id,
        },
        { onConflict: 'id' }
      );

    if (profileError) {
      // Der Auth-Nutzer wurde bereits angelegt und die Mail bereits verschickt —
      // das lässt sich nicht mehr zurückrollen. Wir melden den Fehler klar,
      // damit der Beta-Status manuell im Nutzer-Tab nachgezogen werden kann.
      logger.error('profile upsert after invite failed', { error: profileError.message, userId: newUserId });
      return new Response(
        JSON.stringify({
          error: 'Einladung verschickt, aber Beta-Rechte konnten nicht gesetzt werden. Bitte manuell im Nutzer-Tab nachpflegen.',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    logger.info('Admin invited new beta user', { adminId: caller.id, invitedEmail: normalizedEmail, newUserId });
    return new Response(JSON.stringify({ ok: true, userId: newUserId }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('admin-invite-user failed', { error: message });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
});
