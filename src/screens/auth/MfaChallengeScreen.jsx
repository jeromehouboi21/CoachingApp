// Code-Abfrage nach der Anmeldung (S-06b, Text Lösungsdesign 5.5).
// Erscheint, solange die Sitzung aal1 ist und ein verifizierter Faktor besteht (useAuth.mfaGate).
// Nach erfolgreicher Prüfung meldet Supabase MFA_CHALLENGE_VERIFIED → useAuth gibt die App frei.
// Wiederherstellung: mfa-recovery recover → Faktoren entfernt → Sitzung erneuern → Hinweis im Profil.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { MFA_RECOVERED_FLAG, loadMfaState, requestMfaCheck, verifyFactor } from '../../lib/mfa'
import { MfaCodeForm, WRONG_CODE, GENERIC_ERROR } from '../../components/mfa/MfaCodeForm'
import { RecoveryForm } from '../../components/mfa/RecoveryForm'

export function MfaChallengeScreen() {
  const navigate = useNavigate()
  const [factors, setFactors] = useState(null)
  const [factorIndex, setFactorIndex] = useState(0)
  const [mode, setMode] = useState('code')   // code | recovery
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    loadMfaState().then((s) => {
      if (cancelled) return
      setFactors(s.factors)
      // Kein verifizierter Faktor mehr (z. B. auf einem anderen Gerät entfernt) → Sitzung erneuern
      if (!s.error && s.factors.length === 0) requestMfaCheck()
    })
    return () => { cancelled = true }
  }, [])

  const handleVerify = async (code, reset) => {
    const factor = factors?.[factorIndex]
    if (!factor) return
    setBusy(true)
    setError(null)
    const res = await verifyFactor(factor.id, code)
    setBusy(false)
    if (res.error) {
      setError(res.error === 'wrong_code' ? WRONG_CODE : GENERIC_ERROR)
      reset()
    }
  }

  const handleRecovered = async () => {
    try { sessionStorage.setItem(MFA_RECOVERED_FLAG, '1') } catch { /* Hinweis entfällt dann */ }
    navigate('/profile', { replace: true })
    await requestMfaCheck()   // neue Sitzung ohne Faktor → useAuth gibt die App frei
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col max-w-lg mx-auto px-6 py-12">
      <h1 className="font-display text-[26px] text-ink mb-3">Noch ein kurzer Schritt</h1>

      {mode === 'code' ? (
        <div className="flex flex-col gap-5">
          <p className="text-[15px] text-ink-2 leading-relaxed">Gib den Code aus deiner Authenticator-App ein.</p>
          {factors === null ? (
            <p className="text-[13px] text-ink-3">Wird vorbereitet…</p>
          ) : (
            <MfaCodeForm
              onSubmit={handleVerify}
              busy={busy}
              error={error}
              factors={factors}
              factorIndex={factorIndex}
              onSelectFactor={(i) => { setFactorIndex(i); setError(null) }}
            />
          )}
          <button onClick={() => { setMode('recovery'); setError(null) }} className="text-[13px] text-accent font-medium self-center text-center">
            Kein Zugriff auf deine App? Wiederherstellungscode verwenden
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <p className="text-[15px] text-ink-2 leading-relaxed">
            Gib einen deiner Wiederherstellungscodes ein. Danach ist der zweite Faktor entfernt, und du kannst ihn im Profil neu einrichten.
          </p>
          <RecoveryForm onRecovered={handleRecovered} onCancel={() => setMode('code')} />
        </div>
      )}

      <button onClick={() => supabase.auth.signOut({ scope: 'local' })} className="text-[13px] text-ink-3 self-center mt-10">
        Abmelden
      </button>
    </div>
  )
}
