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
  { id: 'access_state_failed',     codes: ['access_state_failed'],     windowMin: 60,    threshold: 1,  label: 'Kappungsprüfung ausgefallen (U4)' },
  { id: 'delete_incomplete',       codes: ['delete_incomplete', 'auth_delete_failed'], windowMin: 60, threshold: 1, label: 'Kontolöschung unvollständig' },
  { id: 'learning_review_failed',  codes: ['learning_review_failed'],  windowMin: 1440,  threshold: 5,  label: 'Prüfschritt technisch ausgefallen' },
  { id: 'supervision_rejected',    codes: ['supervision_rejected'],    windowMin: 10080, threshold: 2,  label: 'Supervision-Empfehlung verworfen' },
  // Paket K (Rechtstexte v2.0):
  { id: 'consent_check_failed',    codes: ['consent_check_failed'],    windowMin: 60,    threshold: 1,  label: 'Zustimmungsprüfung ausgefallen' },
  { id: 'reflection_review_failed', codes: ['reflection_review_failed'], windowMin: 1440, threshold: 5, label: 'Prüfschritt Reflexionen technisch ausgefallen' },
  // ab C-4 / C-5 (Codes entstehen erst mit diesen Wellen):
  { id: 'export_burst',            codes: ['export_created'],          windowMin: 60,    threshold: 10, label: 'Viele Datenexporte' },
  { id: 'export_incomplete',       codes: ['export_incomplete'],       windowMin: 60,    threshold: 1,  label: 'Datenexport unvollständig' },
  { id: 'mfa_recovery_used',       codes: ['mfa_recovery_used'],       windowMin: 60,    threshold: 1,  label: 'Wiederherstellungscode verwendet' },
  { id: 'mfa_recovery_failed',     codes: ['mfa_recovery_failed'],     windowMin: 60,    threshold: 5,  label: 'Falsche Wiederherstellungscodes' },
  { id: 'mfa_reset_failed',        codes: ['mfa_reset_failed'],        windowMin: 60,    threshold: 1,  label: 'Zweiter Faktor ließ sich nicht entfernen' },
  // Stripe Checkout (Gerüst):
  { id: 'checkout_failed',         codes: ['checkout_session_failed', 'checkout_not_configured'], windowMin: 60, threshold: 3, label: 'Bezahlseite ließ sich nicht öffnen' },
  // nur in der Wochenübersicht:
  // Paket Z (Zahlung und Abo):
  { id: 'stripe_webhook_signature_invalid', codes: ['stripe_webhook_signature_invalid'], windowMin: 60, threshold: 5, label: 'Webhook mit ungültiger Stripe-Signatur' },
  { id: 'stripe_webhook_failed',   codes: ['stripe_webhook_failed'],   windowMin: 60,    threshold: 1,  label: 'Stripe-Ereignis nicht verarbeitet' },
  { id: 'stripe_webhook_unmatched', codes: ['stripe_webhook_unmatched'], windowMin: 60,  threshold: 1,  label: 'Stripe-Abo ohne zugeordnetes Konto' },
  { id: 'stripe_webhook_not_configured', codes: ['stripe_webhook_not_configured'], windowMin: 60, threshold: 1, label: 'Webhook ohne Secret bzw. Schlüssel' },
  { id: 'quota_check_failed',      codes: ['quota_check_failed'],      windowMin: 60,    threshold: 1,  label: 'Monatskontingent nicht prüfbar' },
  { id: 'quota_refund_failed',     codes: ['quota_refund_failed'],     windowMin: 60,    threshold: 1,  label: 'Nachricht nicht zurückgebucht' },
  { id: 'subscription_cancel_failed', codes: ['subscription_cancel_failed'], windowMin: 60, threshold: 1, label: 'Abo bei Kontolöschung nicht gekündigt' },
  { id: 'portal_session_failed',   codes: ['portal_session_failed'],   windowMin: 60,    threshold: 3,  label: 'Kundenportal ließ sich nicht öffnen' },
  { id: 'subscription_events',     codes: ['subscription_started', 'subscription_changed', 'subscription_renewed', 'subscription_ended'], windowMin: 10080, threshold: 0, infoOnly: true, label: 'Abos: begonnen, gewechselt, verlängert, beendet' },
  { id: 'payment_failed',          codes: ['payment_failed'],          windowMin: 10080, threshold: 0, infoOnly: true, label: 'Zahlung gescheitert (Stripe versucht es erneut)' },
  { id: 'quota_events',            codes: ['quota_warned', 'quota_reached', 'quota_refunded'], windowMin: 10080, threshold: 0, infoOnly: true, label: 'Monatskontingent: Hinweis, Grenze, Zurückbuchung' },
  { id: 'stripe_webhook_ignored',  codes: ['stripe_webhook_ignored', 'stripe_webhook_orphan_ended'], windowMin: 10080, threshold: 0, infoOnly: true, label: 'Stripe-Ereignisse ohne Wirkung' },
  { id: 'portal_usage',            codes: ['portal_session_created'],  windowMin: 10080, threshold: 0, infoOnly: true, label: 'Kundenportal geöffnet' },
  { id: 'checkout_usage',         codes: ['checkout_session_created', 'checkout_disabled'], windowMin: 10080, threshold: 0, infoOnly: true, label: 'Bezahlseite geöffnet bzw. noch abgeschaltet' },
  // Paket P (PWA): nur Codes aus dem Browser (origin client)
  { id: 'pwa_client_error',        codes: ['pwa_register_failed', 'pwa_update_failed', 'pwa_install_prompt_failed'], windowMin: 1440, threshold: 10, origin: 'client', label: 'Fehler bei App-Installation oder Update' },
  { id: 'pwa_usage',               codes: ['pwa_launched_standalone', 'pwa_update_applied', 'pwa_install_choice'], windowMin: 10080, threshold: 0, infoOnly: true, origin: 'client', label: 'Installierte App: Starts, Updates, Installationen' },
  // Paket R (Einstiegs-Rundgang): nur Codes aus dem Browser (origin client), ohne Inhalte
  { id: 'tour_usage',              codes: ['tour_shown', 'tour_completed', 'tour_skipped', 'tour_dismissed'], windowMin: 10080, threshold: 0, infoOnly: true, origin: 'client', label: 'Rundgang: gezeigt, beendet, übersprungen, ausgeblendet' },
  { id: 'tour_error',              codes: ['tour_dismiss_failed'],     windowMin: 1440,  threshold: 10, origin: 'client', label: 'Rundgang: „Nicht mehr anzeigen“ nicht gespeichert' },
  // T1 (Buch-Seite): nur Codes aus dem Browser (origin client), ohne Inhalte
  { id: 'book_usage',              codes: ['book_page_viewed', 'book_link_clicked', 'book_status_set'], windowMin: 10080, threshold: 0, infoOnly: true, origin: 'client', label: 'Buch-Seite: aufgerufen, Amazon-Link, Status gesetzt' },
  { id: 'book_error',              codes: ['book_status_failed', 'book_status_invalid_input'], windowMin: 1440, threshold: 5, origin: 'client', label: 'Buch-Status nicht gespeichert' },
  // B1 (Buch-Bezüge im Gespräch): Server-Codes aus chat; Spiegel-Fehler aus dem Browser
  { id: 'book_chat_usage',         codes: ['book_check', 'book_block_sent', 'book_check_skipped', 'book_block_omitted', 'book_blocked_set'], windowMin: 10080, threshold: 0, infoOnly: true, label: 'Buch-Bezüge: geprüft, mitgegeben, übersprungen, gesperrt' },
  { id: 'book_select_error',       codes: ['book_select_failed', 'book_blocked_set_failed'], windowMin: 1440, threshold: 10, label: 'Buch-Auswahl oder Buch-Sperre fehlgeschlagen' },
  { id: 'book_hints_error',        codes: ['book_hints_failed'],       windowMin: 1440,  threshold: 10, origin: 'client', label: 'Spiegel: Fundstellen im Buch nicht ladbar' },
  { id: 'account_deleted_mail_failed', codes: ['account_deleted_mail_failed'], windowMin: 10080, threshold: 0, infoOnly: true, label: 'Löschbestätigung nicht zugestellt' },
  { id: 'consent_required',        codes: ['consent_required'],        windowMin: 10080, threshold: 0, infoOnly: true, label: 'Anfragen ohne Zustimmung v2.0' },
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
  // Passwort Paket K W1 (Ereignisse aus dem Frontend → origin client, nur Wochenübersicht):
  { id: 'password_changed',        codes: ['password_changed', 'password_reset_done'], windowMin: 10080, threshold: 0, infoOnly: true, origin: 'client', label: 'Passwort geändert bzw. neu gesetzt' },
  { id: 'password_change_failed',  codes: ['password_change_failed', 'password_reset_failed', 'invite_password_failed'], windowMin: 10080, threshold: 0, infoOnly: true, origin: 'client', label: 'Passwort ändern gescheitert' },
  { id: 'password_reset_requests', codes: ['password_reset_request_failed', 'signout_others_failed'], windowMin: 10080, threshold: 0, infoOnly: true, origin: 'client', label: 'Reset-Link bzw. Abmelden anderer Geräte gescheitert' },
  // Weiterarbeiten U5a:
  { id: 'weiterarbeiten_started',  codes: ['weiterarbeiten_started'],  windowMin: 10080, threshold: 0, infoOnly: true, label: 'An einer Erkenntnis weitergearbeitet' },
  { id: 'weiterarbeiten_rejected', codes: ['weiterarbeiten_rejected'], windowMin: 10080, threshold: 0, infoOnly: true, label: 'Weiterarbeiten abgelehnt (fremd, anderes Gespräch, „Teile ich nicht“)' },
  // Kennenlernen/Kappung U4:
  { id: 'conversation_cap_reached', codes: ['conversation_cap_reached'], windowMin: 10080, threshold: 0, infoOnly: true, label: 'Gespräch an der Kappungsgrenze' },
  { id: 'display_title_invalid',  codes: ['display_title_invalid'],   windowMin: 10080, threshold: 0, infoOnly: true, label: 'Kurztitel unbrauchbar' },
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
