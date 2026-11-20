// _shared/consent.ts – Zustimmung v2.0 serverseitig prüfen (Paket K, CODE-4)
// Die App sperrt ohne Zustimmung schon im Frontend (ConsentGateScreen); das hier ist die
// verbindliche Prüfung. Versionen wie in src/content/legalTexts.js (CONSENT_VERSION, AGREEMENT_VERSION).
import { HttpError } from './auth.ts';

export const REQUIRED_CONSENT_VERSION = '2.0';
export const REQUIRED_AGREEMENT_VERSION = '2.0';

// deno-lint-ignore no-explicit-any
type AdminClient = any;
// deno-lint-ignore no-explicit-any
type Logger = any;

/** Wirft 403 consent_required ohne gültige Zustimmung. DB-Fehler → 503 (fail-closed, Art. 9). */
export async function requireConsent(admin: AdminClient, userId: string, logger: Logger): Promise<void> {
  const { data, error } = await admin.from('profiles')
    .select('consent_version, consent_given_at, coaching_agreement_version, coaching_agreement_accepted_at')
    .eq('id', userId).maybeSingle();
  if (error) {
    logger.error('consent_check_failed', { code: error.code ?? 'unknown' });
    throw new HttpError(503, 'consent_check_failed');
  }
  const ok = !!data?.consent_given_at && data?.consent_version === REQUIRED_CONSENT_VERSION
    && !!data?.coaching_agreement_accepted_at && data?.coaching_agreement_version === REQUIRED_AGREEMENT_VERSION;
  if (!ok) {
    logger.warn('consent_required', { hasProfile: !!data, consentVersion: data?.consent_version ?? null, agreementVersion: data?.coaching_agreement_version ?? null });
    throw new HttpError(403, 'consent_required');
  }
}
