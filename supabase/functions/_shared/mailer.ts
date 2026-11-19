// supabase/functions/_shared/mailer.ts — Mailversand über One.com-SMTP (S-22, Paket C)
//
// Port 465 (implizites TLS). Port 25/587 sind aus Edge Functions nicht erreichbar.
// Mails enthalten nie Inhalte aus Konten, keine Nutzer-IDs und keine SMTP-Fehlertexte.
// Zurück kommt nur ein Fehlercode (Fehlermeldungen von SMTP-Servern können Adressen enthalten).
// Secrets: SMTP_HOST, SMTP_PORT (465), SMTP_USER, SMTP_PASS, ALERT_EMAIL_FROM, ALERT_EMAIL_TO.

import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

export interface MailResult { ok: boolean; code?: string }

// denomailer 1.6.0 kodiert Zeichen außerhalb von ASCII nicht zuverlässig (Befund 19.11.2026:
// „Sicherheit“ kam als „e2??Sicherheit“ an). Deshalb gehen Betreff und Text als reines ASCII raus.
const ASCII_MAP: Array<[RegExp, string]> = [
  [/ä/g, 'ae'], [/ö/g, 'oe'], [/ü/g, 'ue'], [/Ä/g, 'Ae'], [/Ö/g, 'Oe'], [/Ü/g, 'Ue'], [/ß/g, 'ss'],
  [/[„“”«»]/g, '"'], [/[‚‘’]/g, "'"], [/[–—]/g, '-'], [/·/g, '-'], [/…/g, '...'], [/\u00a0/g, ' '],
];
export function toMailAscii(s: string): string {
  let out = s;
  for (const [re, rep] of ASCII_MAP) out = out.replace(re, rep);
  // deno-lint-ignore no-control-regex
  return out.replace(/[^\t\n\r\x20-\x7e]/g, '?');
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(Object.assign(new Error('smtp_timeout'), { name: 'smtp_timeout' })), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

/** Fehlername auf einen festen, unverfänglichen Code reduzieren. */
function errorCode(e: unknown): string {
  const name = (e as { name?: unknown })?.name;
  return typeof name === 'string' && /^[A-Za-z_]{1,40}$/.test(name) ? name : 'smtp_error';
}

export function alertRecipient(): string | null {
  return Deno.env.get('ALERT_EMAIL_TO') ?? null;
}

export async function sendMail(to: string, subject: string, text: string): Promise<MailResult> {
  const host = Deno.env.get('SMTP_HOST');
  const port = Number(Deno.env.get('SMTP_PORT') ?? '465');
  const user = Deno.env.get('SMTP_USER');
  const pass = Deno.env.get('SMTP_PASS');
  const from = Deno.env.get('ALERT_EMAIL_FROM') ?? user;
  if (!host || !user || !pass || !from) return { ok: false, code: 'smtp_not_configured' };
  if (!to) return { ok: false, code: 'recipient_missing' };
  if (port !== 465) return { ok: false, code: 'smtp_port_not_supported' };

  let client: SMTPClient | null = null;
  try {
    client = new SMTPClient({
      connection: { hostname: host, port, tls: true, auth: { username: user, password: pass } },
    });
    await withTimeout(client.send({ from: `Friedensstifter <${from}>`, to, subject: toMailAscii(subject), content: toMailAscii(text) }), 15_000);
    return { ok: true };
  } catch (e) {
    return { ok: false, code: errorCode(e) };
  } finally {
    try { await client?.close(); } catch { /* egal */ }
  }
}
