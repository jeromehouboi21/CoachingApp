// supabase/functions/admin-feedback/index.ts
// Admin-geschützte Feedback-Übersicht (inkl. Beta-Feedback aus dem Profil-Modal).
// Sicherheitsmuster v2: requireUser + requireAdmin; alle Abfragen über den echten
// service_role-Client (ctx.admin, ohne Nutzer-Token).

import { createLogger, describeError } from '../_shared/logger.ts';
import { HttpError, requireUser, requireAdmin, errorResponse, jsonResponse } from '../_shared/auth.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  let logger = createLogger('admin-feedback');

  try {
    const ctx = await requireUser(req);
    logger = createLogger('admin-feedback', undefined, ctx.user.id);
    try {
      await requireAdmin(ctx);
    } catch (e) {
      if (e instanceof HttpError && e.status === 403) logger.warn('Forbidden — non-admin attempted admin-feedback access');
      throw e;
    }
    const supabase = ctx.admin;

    const { data: feedback, error: feedbackError } = await supabase
      .from('user_feedback')
      .select('id, user_id, feedback_type, content, context, created_at')
      .order('created_at', { ascending: false });

    if (feedbackError) {
      logger.error('feedback list failed', { code: feedbackError.code });
      throw new HttpError(500, 'feedback_list_failed');
    }

    // Profile + E-Mail nachladen und zusammenführen (gleiches Muster wie admin-users)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name');
    if (profilesError) logger.error('profiles fetch failed', { code: profilesError.code });
    const { data: authUsers, error: authListError } = await supabase.auth.admin.listUsers();
    if (authListError) logger.error('auth.admin.listUsers failed', describeError(authListError));

    const nameById = new Map((profiles ?? []).map((p: any) => [p.id, p.display_name]));
    const emailById = new Map((authUsers?.users ?? []).map((u: any) => [u.id, u.email]));

    const merged = (feedback ?? []).map((f: any) => ({
      ...f,
      display_name: f.user_id ? (nameById.get(f.user_id) ?? null) : null,
      email: f.user_id ? (emailById.get(f.user_id) ?? null) : null,
    }));

    logger.info('Admin fetched feedback list', { count: merged.length });
    return jsonResponse({ feedback: merged }, CORS_HEADERS);

  } catch (error: unknown) {
    if (error instanceof HttpError) {
      if (error.status >= 500) logger.error('Request failed', { code: error.code, status: error.status });
      return errorResponse(error, CORS_HEADERS);
    }
    logger.error('admin-feedback failed', describeError(error));
    return errorResponse(error, CORS_HEADERS);
  }
});
