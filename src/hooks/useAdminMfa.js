// Zweiter Faktor (TOTP) für den Admin-Bereich (S-06).
// Geprüft wird im Server (requireAdmin verlangt aal2); dieser Hook ist nur die Bedienung.
// Die eigentlichen Schritte liegen seit S-06b in src/lib/mfa.js (gemeinsam mit dem Profil).
// Log-Regel: Nie QR-Code, Schlüssel oder Code loggen — nur Ereignisse ohne Daten.
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { ADMIN_FACTOR_NAMES, loadMfaState, startEnroll as startEnrollFactor, verifyFactor } from '../lib/mfa'

export const FACTOR_NAMES = ADMIN_FACTOR_NAMES

export function useAdminMfa() {
  const [state, setState] = useState({
    loading: true, level: null, next: null, factors: [], error: null,
  })
  // Nach erfolgreicher Einrichtung bleibt die Erfolgskarte stehen, bis sie geschlossen wird
  const [enrolledJustNow, setEnrolledJustNow] = useState(false)
  // Wunsch, ein weiteres Gerät einzurichten (aus der Erfolgskarte oder dem Admin-Bereich)
  const [addingDevice, setAddingDevice] = useState(false)

  const refresh = useCallback(async () => {
    const s = await loadMfaState()
    setState({ loading: false, ...s })
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const startEnroll = useCallback(() => startEnrollFactor(ADMIN_FACTOR_NAMES), [])

  const verify = useCallback(async (factorId, code, { isEnrollment = false } = {}) => {
    const res = await verifyFactor(factorId, code, { isEnrollment })
    if (res.error) return res
    if (isEnrollment) {
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
