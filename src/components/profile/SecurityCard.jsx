// Profil → „Konto zusätzlich schützen“ (S-06b, Texte Lösungsdesign 5.5).
// Einrichten: MfaEnrollFlow → mfa-recovery codes:generate { afterEnroll } → RecoveryCodesView.
// Mit Faktor: Geräte, weiteres Gerät, neue Wiederherstellungscodes, zweiten Faktor entfernen.
// Erfolg wird erst nach bestätigter Server-Antwort angezeigt. Nie QR, Schlüssel oder Codes loggen.
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ShieldCheck } from 'lucide-react'
import { MFA_RECOVERED_FLAG, USER_FACTOR_NAMES, callMfaRecovery, loadMfaState, startEnroll, verifyFactor } from '../../lib/mfa'
import { MfaEnrollFlow } from '../mfa/MfaEnrollFlow'
import { RecoveryCodesView } from '../mfa/RecoveryCodesView'
import { GENERIC_ERROR } from '../mfa/MfaCodeForm'

function Sheet({ children, onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-surface w-full max-w-lg rounded-t-2xl max-h-[90vh] overflow-y-auto p-6 pb-10">
        {children}
      </div>
    </div>,
    document.body,
  )
}

function readRecoveredFlag() {
  try {
    const v = sessionStorage.getItem(MFA_RECOVERED_FLAG) === '1'
    if (v) sessionStorage.removeItem(MFA_RECOVERED_FLAG)
    return v
  } catch { return false }
}

export function SecurityCard() {
  const [state, setState] = useState({ loading: true, factors: [] })
  // sheet: null | 'enroll' | 'addDevice' | 'codes' | 'newCodes' | 'disable'
  const [sheet, setSheet] = useState(null)
  const [codes, setCodes] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [recovered, setRecovered] = useState(readRecoveredFlag)

  const refresh = useCallback(async () => {
    const s = await loadMfaState()
    setState({ loading: false, factors: s.factors, error: s.error })
  }, [])
  useEffect(() => { refresh() }, [refresh])

  const hasFactor = state.factors.length > 0

  const close = () => { setSheet(null); setCodes(null); setError(null); setBusy(false) }

  const generateCodes = async (afterEnroll) => {
    setBusy(true)
    setError(null)
    const res = await callMfaRecovery('codes:generate', { afterEnroll })
    setBusy(false)
    if (res.ok && Array.isArray(res.data?.codes) && res.data.codes.length > 0) {
      setCodes(res.data.codes)
      setSheet('codes')
      return
    }
    setError(res.status === 429
      ? 'Du hast heute schon mehrmals neue Codes erzeugt. Morgen geht es wieder.'
      : GENERIC_ERROR)
  }

  const onEnrolled = async (firstFactor) => {
    await refresh()
    if (firstFactor) {
      setSheet('codesPending')
      await generateCodes(true)
    } else {
      close()
      setNotice('Das Gerät ist eingerichtet.')
    }
  }

  const disable = async () => {
    setBusy(true)
    setError(null)
    const res = await callMfaRecovery('disable')
    setBusy(false)
    if (!res.ok) { setError(GENERIC_ERROR); return }
    close()
    await refresh()
    setNotice('Der zweite Faktor ist entfernt.')
  }

  return (
    <>
      <div className="bg-surface border border-[var(--color-border)] rounded-lg p-4 mb-4">
        {recovered && !hasFactor && (
          <div className="bg-accent-light rounded-lg p-3 mb-3">
            <p className="text-[13px] text-ink-2 leading-relaxed">
              Du bist wieder angemeldet. Dein zweiter Faktor wurde entfernt. Richte ihn am besten gleich neu ein.
            </p>
          </div>
        )}
        {state.loading ? (
          <p className="text-[13px] text-ink-3">Wird geladen…</p>
        ) : !hasFactor ? (
          <>
            <p className="text-[15px] text-ink">Konto zusätzlich schützen</p>
            <p className="text-[13px] text-ink-3 leading-relaxed mt-1">
              Mit einem zweiten Faktor fragt die App nach der Anmeldung zusätzlich nach einem Code aus einer Authenticator-App. So bleibt dein Konto geschützt, auch wenn jemand dein Passwort kennt. Freiwillig.
            </p>
            <button
              onClick={() => { setNotice(null); setRecovered(false); setSheet('enroll') }}
              className="text-[13px] text-accent font-medium mt-2"
            >
              {recovered ? 'Jetzt einrichten →' : 'Einrichten →'}
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} color="var(--color-accent)" />
              <p className="text-[15px] text-ink">Zweiter Faktor ist eingerichtet</p>
            </div>
            <ul className="mt-2 flex flex-col gap-1">
              {state.factors.map((f, i) => (
                <li key={f.id} className="text-[13px] text-ink-3">
                  {f.friendly_name || `Gerät ${i + 1}`}
                  {f.created_at && ` · seit ${new Date(f.created_at).toLocaleDateString('de-DE')}`}
                </li>
              ))}
            </ul>
            <div className="flex flex-col items-start gap-2 mt-3">
              <button onClick={() => { setNotice(null); setSheet('addDevice') }} className="text-[13px] text-accent font-medium">
                Weiteres Gerät hinzufügen
              </button>
              <button onClick={() => { setNotice(null); setError(null); setSheet('newCodes') }} className="text-[13px] text-accent font-medium">
                Neue Wiederherstellungscodes
              </button>
              <button onClick={() => { setNotice(null); setError(null); setSheet('disable') }} className="text-[13px] text-ink-3">
                Zweiten Faktor entfernen
              </button>
            </div>
          </>
        )}
        {state.error && <p className="text-[13px] text-coral mt-3">{GENERIC_ERROR}</p>}
        {notice && <p className="text-[13px] text-accent mt-3">{notice}</p>}
      </div>

      {(sheet === 'enroll' || sheet === 'addDevice') && (
        <Sheet onClose={close}>
          <h3 className="font-display text-[22px] text-ink mb-2">
            {sheet === 'enroll' ? 'Konto zusätzlich schützen' : 'Weiteres Gerät hinzufügen'}
          </h3>
          <p className="text-[14px] text-ink-2 leading-relaxed mb-5">
            Scanne den QR-Code mit deiner Authenticator-App und gib danach den Code ein, den sie dir zeigt.
          </p>
          <MfaEnrollFlow
            startEnroll={() => startEnroll(USER_FACTOR_NAMES)}
            verify={(factorId, code) => verifyFactor(factorId, code, { isEnrollment: true })}
            onVerified={() => onEnrolled(sheet === 'enroll')}
          />
          <button onClick={close} className="w-full text-[13px] text-ink-3 py-3 mt-2">Abbrechen</button>
        </Sheet>
      )}

      {sheet === 'codesPending' && (
        <Sheet onClose={() => {}}>
          <h3 className="font-display text-[22px] text-ink mb-3">Deine Wiederherstellungscodes</h3>
          {busy && <p className="text-[13px] text-ink-3">Codes werden erzeugt…</p>}
          {error && (
            <>
              <p role="alert" className="text-[13px] text-coral mb-4">
                Der zweite Faktor ist eingerichtet, aber die Wiederherstellungscodes ließen sich gerade nicht erzeugen. {error}
              </p>
              <button
                onClick={() => generateCodes(true)}
                disabled={busy}
                className="w-full bg-accent text-white py-3 rounded-full font-medium disabled:opacity-50 mb-2"
              >
                Noch einmal versuchen
              </button>
              <button onClick={close} className="w-full text-[13px] text-ink-3 py-2">Später im Profil erzeugen</button>
            </>
          )}
        </Sheet>
      )}

      {sheet === 'codes' && codes && (
        <Sheet onClose={() => {}}>
          <RecoveryCodesView codes={codes} onDone={close} />
        </Sheet>
      )}

      {sheet === 'newCodes' && (
        <Sheet onClose={close}>
          <h3 className="font-display text-[22px] text-ink mb-3">Neue Wiederherstellungscodes</h3>
          <p className="text-[14px] text-ink-2 leading-relaxed mb-5">
            Du bekommst zehn neue Codes. Deine bisherigen Codes funktionieren danach nicht mehr.
          </p>
          {error && <p role="alert" className="text-[13px] text-coral mb-3">{error}</p>}
          <button
            onClick={() => generateCodes(false)}
            disabled={busy}
            className="w-full bg-accent text-white py-3 rounded-full font-medium hover:bg-accent-2 transition-colors disabled:opacity-50 mb-2"
          >
            {busy ? 'Wird erstellt…' : 'Neue Codes erstellen'}
          </button>
          <button onClick={close} className="w-full text-[13px] text-ink-3 py-2">Abbrechen</button>
        </Sheet>
      )}

      {sheet === 'disable' && (
        <Sheet onClose={close}>
          <h3 className="font-display text-[22px] text-ink mb-3">Zweiten Faktor entfernen?</h3>
          <p className="text-[14px] text-ink-2 leading-relaxed mb-5">
            Danach fragt die App bei der Anmeldung nur noch nach deinem Passwort bzw. dem Anmeldelink. Alle eingerichteten Geräte und deine Wiederherstellungscodes werden entfernt. Du kannst den zweiten Faktor später jederzeit neu einrichten.
          </p>
          {error && <p role="alert" className="text-[13px] text-coral mb-3">{error}</p>}
          <button
            onClick={disable}
            disabled={busy}
            className="w-full border border-[var(--color-border)] text-ink py-3 rounded-full font-medium disabled:opacity-50 mb-2"
          >
            {busy ? 'Wird entfernt…' : 'Zweiten Faktor entfernen'}
          </button>
          <button onClick={close} className="w-full text-[13px] text-ink-3 py-2">Abbrechen</button>
        </Sheet>
      )}
    </>
  )
}
