// supabase/functions/admin-users/index.ts
// Admin-Nutzerverwaltung: Beta-Tester-Status & individuelle Gesprächslimits.
// Absicherung passiert HIER serverseitig (is_admin-Prüfung) — ein versteckter
// Frontend-Screen allein wäre kein Zugriffsschutz.
// Sicherheitsmuster v2: requireUser + requireAdmin, alle Abfragen über den echten
// service_role-Client (ctx.admin, ohne Nutzer-Token).

import { createLogger, describeError } from '../_shared/logger.ts';
import { HttpError, requireUser, requireAdmin, readJsonBody, isUuid, errorResponse, jsonResponse } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';

const CORS_HEADERS = corsHeaders('GET, PATCH, OPTIONS');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  let logger = createLogger('admin-users');

  try {
    const ctx = await requireUser(req);
    logger = createLogger('admin-users', undefined, ctx.user.id);
    try {
      await requireAdmin(ctx);
    } catch (e) {
      if (e instanceof HttpError && e.code === 'mfa_required') logger.warn('mfa_required');
      else if (e instanceof HttpError && e.status === 403) logger.warn('Forbidden — non-admin attempted admin-users access');
      throw e;
    }
    const supabase = ctx.admin;

    if (req.method === 'GET') {
      // Alle Profile laden ...
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, plan, is_beta_tester, session_limit, trial_sessions_used, created_at, invited_at')
        .order('created_at', { ascending: false });

      if (profilesError) {
        logger.error('profiles list failed', { code: profilesError.code });
        throw new HttpError(500, 'profiles_list_failed');
      }

      // ... und mit E-Mail-Adressen aus auth.users zusammenführen.
      // profiles selbst speichert keine E-Mail — das liegt in Supabase's
      // geschütztem auth-Schema, nur über die Admin-API erreichbar.
      const { data: authUsers, error: authListError } = await supabase.auth.admin.listUsers();
      if (authListError) {
        logger.error('auth.admin.listUsers failed', describeError(authListError));
      }
      const authById = new Map(
        (authUsers?.users ?? []).map((u: any) => [u.id, { email: u.email, lastSignInAt: u.last_sign_in_at }])
      );

      const merged = (profiles ?? []).map((p: any) => ({
        ...p,
        email: authById.get(p.id)?.email ?? null,
        last_sign_in_at: authById.get(p.id)?.lastSignInAt ?? null,
      }));

      // S-15: Konten seit über 24 Monaten ohne Anmeldung (nur Anzahl; Löschung erst mit Mailkanal)
      let inactiveCount: number | null = null;
      const { data: inactive, error: inactiveError } = await supabase.rpc('inactive_accounts_report', { p_months: 24 });
      if (inactiveError) logger.error('inactive_accounts_report failed', { code: inactiveError.code });
      else inactiveCount = (inactive ?? []).length;

      logger.info('Admin fetched user list', { count: merged.length, inactiveCount });
      return jsonResponse({ users: merged, inactiveCount }, CORS_HEADERS);
    }

    if (req.method === 'PATCH') {
      const { userId, is_beta_tester, session_limit } = await readJsonBody(req, 4 * 1024);
      if (!isUuid(userId)) {
        return jsonResponse({ error: 'userId fehlt' }, CORS_HEADERS, 400);
      }

      const patch: Record<string, unknown> = {};
      if (typeof is_beta_tester === 'boolean') patch.is_beta_tester = is_beta_tester;
      if (session_limit === null || (typeof session_limit === 'number' && Number.isInteger(session_limit) && session_limit >= 0)) {
        patch.session_limit = session_limit;
      }

      if (Object.keys(patch).length === 0) {
        return jsonResponse({ error: 'Keine gültigen Felder übergeben' }, CORS_HEADERS, 400);
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', userId);

      if (updateError) {
        logger.error('profile update failed', { code: updateError.code, targetUserId: userId });
        throw new HttpError(500, 'profile_update_failed');
      }

      logger.info('Admin updated user profile', { targetUserId: userId, patch });
      return jsonResponse({ ok: true }, CORS_HEADERS);
    }

    return jsonResponse({ error: 'Method not allowed' }, CORS_HEADERS, 405);

  } catch (error: unknown) {
    if (error instanceof HttpError) {
      if (error.status >= 500) logger.error('Request failed', { code: error.code, status: error.status });
      return errorResponse(error, CORS_HEADERS);
    }
    logger.error('admin-users failed', describeError(error));
    return errorResponse(error, CORS_HEADERS);
  }
});
