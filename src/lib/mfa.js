// src/lib/mfa.js — Zweiter Faktor (TOTP) für Admin (S-06) und alle Nutzer (S-06b)
// Maßgeblich ist der Server (requireUser/requireAdmin, RLS mfa_satisfied); hier nur die Bedienung.
// Log-Regel: Nie QR-Code, Schlüssel, Codes oder Wiederherstellungscodes loggen – nur Ereignisse.
import { supabase } from './supabase'
import { createLogger } from './logger'
import { functionHeaders, functionUrl } from './functions'

const logger = createLogger('mfa')

export const ADMIN_FACTOR_NAMES = ['Friedensstifter Admin', 'Friedensstifter Admin 2', 'Friedensstifter Admin 3']
export const USER_FACTOR_NAMES = ['Friedensstifter', 'Friedensstifter 2', 'Friedensstifter 3']
/** sessionStorage: nach Wiederherstellung im Profil auf das Neu-Einrichten hinweisen */
export const MFA_RECOVERED_FLAG = 'fs_mfa_recovered'

/** Sicherheitsstufe und verifizierte TOTP-Faktoren. */
export async function loadMfaState() {
  const [{ data: aal, error: e1 }, { data: f, error: e2 }] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ])
  const err = e1 || e2
  if (err) logger.warn('mfa_state_failed', { code: err.code ?? 'unknown' })
  const all = f?.all ?? []
  return {
    level: aal?.currentLevel ?? null,
    next: aal?.nextLevel ?? null,
    factors: all.filter(x => x.factor_type === 'totp' && x.status === 'verified'),
    error: err ? 'state_failed' : null,
  }
}

/**
 * Startet eine Einrichtung. Nicht abgeschlossene Versuche werden vorher entfernt,
 * sonst blockiert Supabase einen weiteren Faktor mit demselben Namen.
 */
export async function startEnroll(names) {
  const { data: f } = await supabase.auth.mfa.listFactors()
  for (const stale of (f?.all ?? []).filter(x => x.factor_type === 'totp' && x.status !== 'verified')) {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: stale.id })
    if (error) logger.warn('mfa_unenroll_stale_failed', { code: error.code ?? 'unknown' })
  }
  const usedNames = new Set((f?.all ?? []).filter(x => x.status === 'verified').map(x => x.friendly_name))
  const friendlyName = names.find(n => !usedNames.has(n)) ?? `${names[0]} ${Date.now()}`
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName })
  if (error || !data?.id) {
    logger.warn('mfa_enroll_failed', { code: error?.code ?? 'unknown' })
    return { error: 'enroll_failed' }
  }
  return { factorId: data.id, qrCode: data.totp?.qr_code, secret: data.totp?.secret }
}

/** Code prüfen → Sitzung wird aal2. Falsche Codes zählt das Monitoring (mfa_verify_failed, origin client). */
export async function verifyFactor(factorId, code, { isEnrollment = false } = {}) {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
  if (error) {
    logger.warn('mfa_verify_failed', { code: error.code ?? 'unknown' })
    return { error: error.code === 'mfa_verification_failed' || error.status === 422 ? 'wrong_code' : 'verify_failed' }
  }
  if (isEnrollment) logger.info('mfa_enrolled')
  return { error: null }
}

/** Aufruf der Function mfa-recovery. Liefert { ok, status, data }. */
export async function callMfaRecovery(action, extra = {}) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return { ok: false, status: 401, data: null }
    const res = await fetch(functionUrl('mfa-recovery'), {
      method: 'POST',
      headers: functionHeaders(session.access_token),
      body: JSON.stringify({ action, ...extra }),
    })
    let data = null
    try { data = await res.json() } catch { /* ohne JSON */ }
    if (!res.ok) logger.warn('mfa_recovery_request_failed', { action, status: res.status, code: data?.error ?? null })
    reportIfMfaRequired(res.status, data)
    return { ok: res.ok, status: res.status, data }
  } catch (err) {
    logger.warn('mfa_recovery_request_failed', { action, status: 0, errorType: err?.name ?? 'Error' })
    return { ok: false, status: 0, data: null }
  }
}

// ── Globaler Fehlerpfad ─────────────────────────────────────────────────────
// useAuth ist kein gemeinsamer Context: Jede Komponente hat einen eigenen Zustand. Deshalb wird
// hier einmal die Sitzung erneuert; das Ereignis TOKEN_REFRESHED bringt jede useAuth-Instanz dazu,
// die Sicherheitsstufe neu zu prüfen (mit aktueller Faktorliste vom Server).
let refreshing = null
export function requestMfaCheck() {
  if (refreshing) return refreshing
  refreshing = supabase.auth.refreshSession()
    .then(({ error }) => { if (error) logger.warn('mfa_check_refresh_failed', { code: error.code ?? 'unknown' }) })
    .finally(() => { refreshing = null })
  return refreshing
}

/** 403 mfa_required (Functions) bzw. 42501 mfa_required (RPC) → Sicherheitsstufe neu prüfen. */
export function reportIfMfaRequired(status, body) {
  if (status === 403 && body?.error === 'mfa_required') { requestMfaCheck(); return true }
  return false
}
/** Für fetch-Antworten von Functions: liest bei 403 eine Kopie des Bodys, die Antwort bleibt unberührt. */
export async function checkMfaResponse(res) {
  if (res?.status !== 403) return false
  try { return reportIfMfaRequired(403, await res.clone().json()) } catch { return false }
}
export function reportIfMfaRpcError(error) {
  if (error?.code === '42501' && /mfa_required/.test(error?.message ?? '')) { requestMfaCheck(); return true }
  return false
}
