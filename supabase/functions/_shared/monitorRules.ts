// supabase/functions/_shared/monitorRules.ts — Regeln für security-monitor (S-22, Paket C)
//
// Log-Codes sind die Schnittstelle zwischen den Functions und dem Monitoring.
// Neue Codes, die überwacht werden sollen, kommen HIER hinein (mit Schwelle oder als infoOnly).
// origin: 'server' (Standard) = nur Einträge aus Edge Functions/SQL; 'client' = nur aus dem Frontend.
// Client-Einträge kann jeder angemeldete Nutzer schreiben → nur dort zählen, wo es keinen
// Server-Code gibt (mfa_verify_failed passiert ausschließlich im Browser).

export interface Rule {
  id: string;
  codes: string[];
  windowMin: number;
  threshold: number;
  infoOnly?: boolean;
  origin?: 'server' | 'client';
  /** Was die Regel bedeutet – erscheint in Mail und Admin-Tab, ohne Daten. */
  label: string;
}

export const RULES: Rule[] = [
  { id: 'auth_rejected',           codes: ['auth_rejected'],           windowMin: 60,    threshold: 51, label: 'Abgelehnte Anfragen (401/403)' },
  { id: 'userid_mismatch',         codes: ['userId mismatch'],         windowMin: 60,    threshold: 1,  label: 'Fremde userId im Body' },
  { id: 'admin_mfa_required',      codes: ['mfa_required'],            windowMin: 60,    threshold: 3,  label: 'Admin-Zugriff ohne zweiten Faktor' },
  { id: 'mfa_verify_failed',       codes: ['mfa_verify_failed'],       windowMin: 60,    threshold: 5,  origin: 'client', label: 'Falsche MFA-Codes (über die App)' },
  { id: 'assistant_insert_failed', codes: ['assistant_insert_failed'], windowMin: 60,    threshold: 1,  label: 'Antwort konnte nicht gespeichert werden' },
  { id: 'message_insert_failed',   codes: ['user_message_insert_failed', 'opening_insert_failed'], windowMin: 60, threshold: 3, label: 'Nachricht konnte nicht gespeichert werden' },
  { id: 'rate_limit_db_error',     codes: ['rate_limit_db_error'],     windowMin: 60,    threshold: 1,  label: 'Rate-Limits ausgefallen' },
  { id: 'delete_incomplete',       codes: ['delete_incomplete', 'auth_delete_failed'], windowMin: 60, threshold: 1, label: 'Kontolöschung unvollständig' },
  { id: 'learning_review_failed',  codes: ['learning_review_failed'],  windowMin: 1440,  threshold: 5,  label: 'Prüfschritt technisch ausgefallen' },
  { id: 'supervision_rejected',    codes: ['supervision_rejected'],    windowMin: 10080, threshold: 2,  label: 'Supervision-Empfehlung verworfen' },
  // ab C-4 / C-5 (Codes entstehen erst mit diesen Wellen):
  { id: 'export_burst',            codes: ['export_created'],          windowMin: 60,    threshold: 10, label: 'Viele Datenexporte' },
  { id: 'export_incomplete',       codes: ['export_incomplete'],       windowMin: 60,    threshold: 1,  label: 'Datenexport unvollständig' },
  { id: 'mfa_recovery_used',       codes: ['mfa_recovery_used'],       windowMin: 60,    threshold: 1,  label: 'Wiederherstellungscode verwendet' },
  { id: 'mfa_recovery_failed',     codes: ['mfa_recovery_failed'],     windowMin: 60,    threshold: 5,  label: 'Falsche Wiederherstellungscodes' },
  { id: 'mfa_reset_failed',        codes: ['mfa_reset_failed'],        windowMin: 60,    threshold: 1,  label: 'Zweiter Faktor ließ sich nicht entfernen' },
  // nur in der Wochenübersicht:
  { id: 'user_mfa_required',       codes: ['user_mfa_required'],       windowMin: 10080, threshold: 0, infoOnly: true, label: 'Nutzer-Anfragen ohne zweiten Faktor' },
  { id: 'mfa_codes_generated',     codes: ['mfa_codes_generated'],     windowMin: 10080, threshold: 0, infoOnly: true, label: 'Neue Wiederherstellungscodes erzeugt' },
  { id: 'mfa_disabled',            codes: ['mfa_disabled'],            windowMin: 10080, threshold: 0, infoOnly: true, label: 'Zweiter Faktor entfernt (durch Nutzer)' },
  { id: 'mfa_mail_failed',         codes: ['mfa_mail_failed'],         windowMin: 10080, threshold: 0, infoOnly: true, label: 'Mail zum zweiten Faktor nicht versandt' },
  { id: 'legacy_format',          codes: ['legacy_format'],           windowMin: 10080, threshold: 0, infoOnly: true, label: 'Alte App-Version (409)' },
  { id: 'learning_entry_saved',    codes: ['learning_entry_saved'],    windowMin: 10080, threshold: 0, infoOnly: true, label: 'Neue Lernbasis-Einträge' },
  { id: 'learning_rejected',       codes: ['learning_rejected'],       windowMin: 10080, threshold: 0, infoOnly: true, label: 'Abgelehnte Lernbasis-Einträge' },
  { id: 'supervision_protocol_rejected', codes: ['supervision_protocol_rejected'], windowMin: 10080, threshold: 0, infoOnly: true, label: 'Supervision-Protokoll verworfen' },
  { id: 'export_created',          codes: ['export_created'],          windowMin: 10080, threshold: 0, infoOnly: true, label: 'Datenexporte' },
  { id: 'export_mail_failed',      codes: ['export_mail_failed'],      windowMin: 10080, threshold: 0, infoOnly: true, label: 'Bestätigungsmail zum Export nicht versandt' },
  // Modellwechsel T0 (Qualität, keine Sicherheit):
  { id: 'coach_response_truncated', codes: ['coach_response_truncated'], windowMin: 10080, threshold: 0, infoOnly: true, label: 'Coach-Antwort abgeschnitten (max_tokens)' },
  { id: 'coach_response_unexpected_stop', codes: ['coach_response_unexpected_stop'], windowMin: 10080, threshold: 0, infoOnly: true, label: 'Coach-Antwort mit unerwartetem Ende (z. B. refusal)' },
  { id: 'empty_text_response',     codes: ['empty_text_response'],     windowMin: 10080, threshold: 0, infoOnly: true, label: 'Modellantwort ohne Text' },
  // Gesprächseinstieg U3:
  { id: 'resume_started',          codes: ['resume_started'],          windowMin: 10080, threshold: 0, infoOnly: true, label: 'Gespräch weitergeführt (Einstieg)' },
  { id: 'resume_rejected',         codes: ['resume_rejected'],         windowMin: 10080, threshold: 0, infoOnly: true, label: 'Weiterführen abgelehnt (kein eigener Beitrag)' },
  { id: 'display_title_invalid',   codes: ['display_title_invalid'],   windowMin: 10080, threshold: 0, infoOnly: true, label: 'Kurztitel unbrauchbar' },
];

// Lebenszeichen: Alarm, wenn ein erwarteter Eintrag AUSBLEIBT (stilles Scheitern von Cron-Jobs).
// Beide Codes schreibt der Server (apply_retention bzw. supervision bei jedem Lauf, auch ohne Daten).
export interface Heartbeat {
  id: string;
  code: string;
  label: string;
  /** Lebenszeichen fehlt, wenn es in diesem Zeitraum keinen Eintrag gibt. */
  since: (now: Date) => Date | null;   // null = gerade nicht prüfen
  cooldownHours: number;
}

function mondayStartUtc(now: Date): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const daysSinceMonday = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - daysSinceMonday);
  return d;
}
export { mondayStartUtc };

export const HEARTBEATS: Heartbeat[] = [
  {
    id: 'retention_missing', code: 'retention_applied', label: 'Fristen-Job (apply-retention) ist nicht gelaufen',
    since: (now) => new Date(now.getTime() - 26 * 3600_000), cooldownHours: 24,
  },
  {
    // Cron weekly-supervision: montags 06:00 UTC → ab 08:00 UTC muss supervision_run da sein
    id: 'supervision_missing', code: 'supervision_run', label: 'Supervision-Lauf fehlt diese Woche',
    since: (now) => (now.getUTCDay() === 1 && now.getUTCHours() >= 8) ? mondayStartUtc(now) : null,
    cooldownHours: 24,
  },
];

/** Mindestabstand zwischen zwei Alarmen derselben Regel. Lange Fenster melden höchstens einmal pro Fenster. */
export const COOLDOWN_HOURS = 6;
export function cooldownHoursFor(rule: Rule): number {
  return Math.max(COOLDOWN_HOURS, rule.windowMin / 60);
}

/** Wochenübersicht: montags im Lauf um 06:07 UTC. */
export const DIGEST_WEEKDAY_UTC = 1;
export const DIGEST_HOUR_UTC = 6;
