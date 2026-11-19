// Zweiter Faktor (TOTP) für den Admin-Bereich (S-06).
// Geprüft wird im Server (requireAdmin verlangt aal2); dieser Hook ist nur die Bedienung.
// Log-Regel: Nie QR-Code, Schlüssel oder Code loggen — nur Ereignisse ohne Daten.
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { createLogger } from '../lib/logger'

const logger = createLogger('useAdminMfa')

export const FACTOR_NAMES = ['Friedensstifter Admin', 'Friedensstifter Admin 2', 'Friedensstifter Admin 3']

export function useAdminMfa() {
  const [state, setState] = useState({
    loading: true, level: null, next: null, factors: [], error: null,
  })
  // Nach erfolgreicher Einrichtung bleibt die Erfolgskarte stehen, bis sie geschlossen wird
  const [enrolledJustNow, setEnrolledJustNow] = useState(false)
  // Wunsch, ein weiteres Gerät einzurichten (aus der Erfolgskarte oder dem Admin-Bereich)
  const [addingDevice, setAddingDevice] = useState(false)

  const refresh = useCallback(async () => {
    const [{ data: aal, error: e1 }, { data: f, error: e2 }] = await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ])
    const err = e1 || e2
    if (err) logger.warn('mfa_state_failed', { code: err.code ?? 'unknown' })
    const all = f?.all ?? []
    setState({
      loading: false,
      level: aal?.currentLevel ?? null,
      next: aal?.nextLevel ?? null,
      factors: all.filter(x => x.factor_type === 'totp' && x.status === 'verified'),
      unverified: all.filter(x => x.factor_type === 'totp' && x.status !== 'verified'),
      error: err ? 'state_failed' : null,
    })
  }, [])

  useEffect(() => { refresh() }, [refresh])

  // Startet eine Einrichtung. Nicht abgeschlossene Versuche werden vorher entfernt,
  // sonst blockiert Supabase einen weiteren Faktor mit demselben Namen.
  const startEnroll = useCallback(async () => {
    const { data: f } = await supabase.auth.mfa.listFactors()
    for (const stale of (f?.all ?? []).filter(x => x.factor_type === 'totp' && x.status !== 'verified')) {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: stale.id })
      if (error) logger.warn('mfa_unenroll_stale_failed', { code: error.code ?? 'unknown' })
    }
    const usedNames = new Set((f?.all ?? []).filter(x => x.status === 'verified').map(x => x.friendly_name))
    const friendlyName = FACTOR_NAMES.find(n => !usedNames.has(n)) ?? `Friedensstifter Admin ${Date.now()}`
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName })
    if (error || !data?.id) {
      logger.warn('mfa_enroll_failed', { code: error?.code ?? 'unknown' })
      return { error: 'enroll_failed' }
    }
    return { factorId: data.id, qrCode: data.totp?.qr_code, secret: data.totp?.secret }
  }, [])

  const verify = useCallback(async (factorId, code, { isEnrollment = false } = {}) => {
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
    if (error) {
      logger.warn('mfa_verify_failed', { code: error.code ?? 'unknown' })
      return { error: error.code === 'mfa_verification_failed' || error.status === 422 ? 'wrong_code' : 'verify_failed' }
    }
    if (isEnrollment) {
      logger.info('mfa_enrolled')
      setEnrolledJustNow(true)
      setAddingDevice(false)
    }
    await refresh()
    return { error: null }
  }, [refresh])

  return {
    ...state,
    enrolledJustNow,
    addingDevice,
    refresh,
    startEnroll,
    verify,
    dismissSuccess: () => setEnrolledJustNow(false),
    beginAddDevice: () => { setEnrolledJustNow(false); setAddingDevice(true) },
    cancelAddDevice: () => setAddingDevice(false),
  }
}

// Damit der Admin-Bereich bei 403 mfa_required neu prüfen bzw. ein weiteres Gerät anbieten kann
export const AdminMfaContext = createContext(null)
export const useAdminMfaContext = () => useContext(AdminMfaContext)
