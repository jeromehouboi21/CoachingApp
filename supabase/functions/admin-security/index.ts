// supabase/functions/admin-security/index.ts — Admin-Tab „Sicherheit“ (S-22, Paket C)
// Sicherheitsmuster v2: requireUser + requireAdmin (aal2). Liefert die letzten Alarme,
// die neueste Wochenübersicht und den Zeitpunkt des letzten Monitor-Laufs. Nur Zähler und Codes.

import { createLogger, describeError } from '../_shared/logger.ts';
import { HttpError, requireUser, requireAdmin, errorResponse, jsonResponse } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { RULES, HEARTBEATS } from '../_shared/monitorRules.ts';

const CORS_HEADERS = corsHeaders('GET, OPTIONS');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  let logger = createLogger('admin-security');

  try {
    const ctx = await requireUser(req);
    logger = createLogger('admin-security', undefined, ctx.user.id);
    try {
      await requireAdmin(ctx);
    } catch (e) {
      if (e instanceof HttpError && e.code === 'mfa_required') logger.warn('mfa_required');
      else if (e instanceof HttpError && e.status === 403) logger.warn('Forbidden — non-admin attempted admin-security access');
      throw e;
    }
    const admin = ctx.admin;

    const [alertsRes, digestRes, lastRunRes] = await Promise.all([
      admin.from('security_alerts')
        .select('id, kind, rule, window_start, window_end, count, mailed_at, mail_error, created_at')
        .in('kind', ['alert', 'probe'])
        .order('created_at', { ascending: false }).limit(50),
      admin.from('security_alerts')
        .select('window_start, window_end, details, mailed_at, mail_error, created_at')
        .eq('kind', 'weekly_digest')
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('app_logs')
        .select('created_at')
        .eq('message', 'security_monitor_run').eq('origin', 'server')
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (alertsRes.error) {
      logger.error('security_alerts list failed', { code: alertsRes.error.code });
      throw new HttpError(500, 'alerts_list_failed');
    }
    if (digestRes.error) logger.error('weekly_digest fetch failed', { code: digestRes.error.code });
    if (lastRunRes.error) logger.error('monitor run fetch failed', { code: lastRunRes.error.code });

    const labels = Object.fromEntries([
      ...RULES.map((r) => [r.id, r.label]),
      ...HEARTBEATS.map((h) => [h.id, h.label]),
      ['probe', 'Testmail Alarmkanal'],
    ]);

    logger.info('Admin fetched security alerts', { count: alertsRes.data?.length ?? 0 });
    return jsonResponse({
      alerts: (alertsRes.data ?? []).map((a) => ({
        id: a.id, kind: a.kind, rule: a.rule, label: labels[a.rule] ?? a.rule,
        window_start: a.window_start, window_end: a.window_end, count: a.count,
        mailed: !!a.mailed_at, mail_error: a.mail_error, created_at: a.created_at,
      })),
      digest: digestRes.data ?? null,
      lastRunAt: lastRunRes.data?.created_at ?? null,
      labels,
    }, CORS_HEADERS);

  } catch (error: unknown) {
    if (error instanceof HttpError) {
      if (error.status >= 500) logger.error('Request failed', { code: error.code, status: error.status });
      return errorResponse(error, CORS_HEADERS);
    }
    logger.error('admin-security failed', describeError(error));
    return errorResponse(error, CORS_HEADERS);
  }
});
