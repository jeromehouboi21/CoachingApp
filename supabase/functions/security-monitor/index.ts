// supabase/functions/security-monitor/index.ts — stündliches Monitoring (S-22, Paket C)
//
// Nur intern (Cron 'security-monitor' um :07, Header x-cron-secret aus Vault).
// Zählt Log-Codes nach _shared/monitorRules.ts, legt bei Überschreitung einen Alarm an
// (security_alerts) und schickt eine Mail – nur Regel, Anzahl, Zeitfenster. Prüft Lebenszeichen
// der Cron-Jobs und schickt montags eine Wochenübersicht. Body { probe: true } → Testmail.
// Mails und Antworten enthalten nie IDs, Inhalte oder SMTP-Fehlertexte.

import { createLogger, describeError } from '../_shared/logger.ts';
import { HttpError, createAdminClient, requireInternalCaller, readJsonBody, errorResponse, jsonResponse } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { sendMail, alertRecipient, type MailResult } from '../_shared/mailer.ts';
import {
  RULES, HEARTBEATS, cooldownHoursFor, mondayStartUtc, DIGEST_WEEKDAY_UTC, DIGEST_HOUR_UTC, type Rule,
} from '../_shared/monitorRules.ts';

const CORS_HEADERS = corsHeaders('POST, OPTIONS', { extraAllowedHeaders: ['x-cron-secret'] });
const NOTFALLPLAN = 'docs/security/notfallplan.md';

type Admin = ReturnType<typeof createAdminClient>;

function fmt(d: Date): string {
  return d.toISOString().replace('T', ' ').slice(0, 16);
}

/** Zählt die Codes einer Regel seit `since`, gefiltert nach Herkunft. Wirft bei DB-Fehler. */
async function countRule(admin: Admin, rule: Pick<Rule, 'codes' | 'origin'>, since: Date): Promise<number> {
  const { data, error } = await admin.rpc('security_log_counts', { p_since: since.toISOString(), p_codes: rule.codes });
  if (error) throw new HttpError(500, 'log_count_failed');
  const origin = rule.origin ?? 'server';
  return (data ?? [])
    .filter((r: { origin: string }) => r.origin === origin)
    .reduce((sum: number, r: { n: number | string }) => sum + Number(r.n), 0);
}

async function inCooldown(admin: Admin, ruleId: string, hours: number): Promise<boolean> {
  const { count, error } = await admin
    .from('security_alerts').select('id', { count: 'exact', head: true })
    .eq('kind', 'alert').eq('rule', ruleId)
    .gte('created_at', new Date(Date.now() - hours * 3600_000).toISOString());
  if (error) throw new HttpError(500, 'cooldown_check_failed');
  return (count ?? 0) > 0;
}

/** Alarm anlegen, Mail schicken, Ergebnis vermerken. Kein stilles Scheitern: Mailfehler als Code in der Zeile. */
async function raiseAlert(
  admin: Admin, logger: ReturnType<typeof createLogger>,
  a: { kind: 'alert' | 'weekly_digest' | 'probe'; rule: string; windowStart: Date; windowEnd: Date; count: number; details?: Record<string, unknown> },
  mail: { subject: string; text: string },
): Promise<MailResult> {
  const { data: row, error } = await admin.from('security_alerts').insert({
    kind: a.kind, rule: a.rule, window_start: a.windowStart.toISOString(), window_end: a.windowEnd.toISOString(),
    count: a.count, details: a.details ?? {},
  }).select('id').single();
  if (error || !row) {
    logger.error('security_alert_insert_failed', { rule: a.rule, code: error?.code ?? 'unknown' });
    throw new HttpError(500, 'alert_insert_failed');
  }

  const to = alertRecipient();
  const result = to ? await sendMail(to, mail.subject, mail.text) : { ok: false, code: 'recipient_missing' };
  const { error: updError } = await admin.from('security_alerts')
    .update(result.ok ? { mailed_at: new Date().toISOString() } : { mail_error: result.code ?? 'smtp_error' })
    .eq('id', row.id);
  if (updError) logger.error('security_alert_update_failed', { rule: a.rule, code: updError.code });
  if (result.ok) logger.info('security_alert_mailed', { rule: a.rule, kind: a.kind });
  else logger.warn('security_alert_mail_failed', { rule: a.rule, kind: a.kind, code: result.code });
  return result;
}

function alertMail(label: string, ruleId: string, count: number, start: Date, end: Date) {
  return {
    subject: `Friedensstifter · Sicherheitsalarm: ${ruleId}`,
    text: [
      `${ruleId} (${label}): ${count} Ereignisse zwischen ${fmt(start)} und ${fmt(end)} (UTC).`,
      '',
      'Details im Admin-Bereich unter „Sicherheit“.',
      `Notfallplan: ${NOTFALLPLAN}`,
    ].join('\n'),
  };
}

function heartbeatMail(label: string, ruleId: string, since: Date, now: Date) {
  return {
    subject: `Friedensstifter · Sicherheitsalarm: ${ruleId}`,
    text: [
      `${ruleId}: ${label}. Kein Lebenszeichen zwischen ${fmt(since)} und ${fmt(now)} (UTC).`,
      '',
      'Bitte Cron-Jobs prüfen (SQL: select jobname, active from cron.job; und cron.job_run_details).',
      'Details im Admin-Bereich unter „Sicherheit“.',
      `Notfallplan: ${NOTFALLPLAN}`,
    ].join('\n'),
  };
}

async function weeklyDigest(admin: Admin, logger: ReturnType<typeof createLogger>, now: Date): Promise<boolean> {
  if (now.getUTCDay() !== DIGEST_WEEKDAY_UTC || now.getUTCHours() !== DIGEST_HOUR_UTC) return false;
  const monday = mondayStartUtc(now);
  const { count: existing, error: exError } = await admin
    .from('security_alerts').select('id', { count: 'exact', head: true })
    .eq('kind', 'weekly_digest').gte('created_at', monday.toISOString());
  if (exError) throw new HttpError(500, 'digest_check_failed');
  if ((existing ?? 0) > 0) return false;

  const since = new Date(now.getTime() - 7 * 24 * 3600_000);
  const counts: Record<string, number> = {};
  for (const rule of RULES) counts[rule.id] = await countRule(admin, rule, since);

  const { count: alertsWeek } = await admin.from('security_alerts').select('id', { count: 'exact', head: true })
    .eq('kind', 'alert').gte('created_at', since.toISOString());
  const { count: crisisNew, error: c1 } = await admin.from('crisis_events').select('id', { count: 'exact', head: true })
    .gte('detected_at', since.toISOString());
  const { count: crisisOpen, error: c2 } = await admin.from('crisis_events').select('id', { count: 'exact', head: true })
    .eq('reviewed_by_jerome', false);
  const { data: inactive, error: c3 } = await admin.rpc('inactive_accounts_report', { p_months: 24 });
  if (c1 || c2 || c3) logger.warn('digest_partial', { crisis: !!(c1 || c2), inactive: !!c3 });

  const details = {
    counts,
    alerts_7d: alertsWeek ?? 0,
    crisis_new_7d: c1 ? null : (crisisNew ?? 0),
    crisis_unreviewed: c2 ? null : (crisisOpen ?? 0),
    inactive_accounts_24m: c3 ? null : (inactive?.length ?? 0),
  };
  const show = (v: number | null) => (v === null ? 'nicht verfügbar' : String(v));
  const lines = [
    `Wochenübersicht ${fmt(since)} – ${fmt(now)} (UTC)`,
    '',
    'Regel – Anzahl (7 Tage)',
    ...RULES.map((r) => `  ${r.id} – ${counts[r.id]}${r.infoOnly ? ' (Info)' : ''}`),
    '',
    `Alarme in dieser Woche: ${details.alerts_7d}`,
    `Krisenereignisse neu: ${show(details.crisis_new_7d)} · ungesichtet gesamt: ${show(details.crisis_unreviewed)}`,
    `Konten ohne Anmeldung seit 24 Monaten: ${show(details.inactive_accounts_24m)}`,
    '',
    'Details im Admin-Bereich unter „Sicherheit“.',
  ];
  await raiseAlert(admin, logger,
    { kind: 'weekly_digest', rule: 'weekly_digest', windowStart: since, windowEnd: now, count: details.alerts_7d, details },
    { subject: 'Friedensstifter · Wochenübersicht Sicherheit', text: lines.join('\n') });
  return true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const logger = createLogger('security-monitor');

  try {
    requireInternalCaller(req);
    const admin = createAdminClient();
    const body = await readJsonBody(req, 1024);
    const now = new Date();

    // Testmail für den Alarmkanal (J-C3)
    if (body.probe === true) {
      const result = await raiseAlert(admin, logger,
        { kind: 'probe', rule: 'probe', windowStart: now, windowEnd: now, count: 0 },
        { subject: 'Test: Alarmkanal Friedensstifter', text: 'Diese Testmail bestätigt, dass Sicherheitsalarme dich erreichen.' });
      return jsonResponse({ ok: result.ok, ...(result.code ? { code: result.code } : {}) }, CORS_HEADERS);
    }

    let alerts = 0;

    // 1. Schwellen
    for (const rule of RULES) {
      if (rule.infoOnly) continue;
      const start = new Date(now.getTime() - rule.windowMin * 60_000);
      const count = await countRule(admin, rule, start);
      if (count < rule.threshold) continue;
      if (await inCooldown(admin, rule.id, cooldownHoursFor(rule))) continue;
      await raiseAlert(admin, logger,
        { kind: 'alert', rule: rule.id, windowStart: start, windowEnd: now, count, details: { threshold: rule.threshold } },
        alertMail(rule.label, rule.id, count, start, now));
      alerts++;
    }

    // 2. Lebenszeichen der Cron-Jobs
    for (const hb of HEARTBEATS) {
      const since = hb.since(now);
      if (!since) continue;
      const count = await countRule(admin, { codes: [hb.code], origin: 'server' }, since);
      if (count > 0) continue;
      if (await inCooldown(admin, hb.id, hb.cooldownHours)) continue;
      await raiseAlert(admin, logger,
        { kind: 'alert', rule: hb.id, windowStart: since, windowEnd: now, count: 0, details: { heartbeat: hb.code } },
        heartbeatMail(hb.label, hb.id, since, now));
      alerts++;
    }

    // 3. Wochenübersicht (montags, Lauf um 06:07 UTC)
    const digest = await weeklyDigest(admin, logger, now);

    logger.info('security_monitor_run', { alerts, digest });
    return jsonResponse({ ok: true, alerts }, CORS_HEADERS);

  } catch (error: unknown) {
    if (error instanceof HttpError) {
      if (error.status >= 500) logger.error('security_monitor_failed', { code: error.code });
      return errorResponse(error, CORS_HEADERS);
    }
    logger.error('security_monitor_failed', describeError(error));
    return errorResponse(error, CORS_HEADERS);
  }
});
