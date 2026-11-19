// /passwort-neu (Paket K, W1): neues Passwort nach dem Link aus der Reset-Mail.
// Nur mit Recovery-Sitzung (passwordRecovery.js). Hat das Konto einen zweiten Faktor, zeigt App vorher
// die Code-Abfrage (mfaGate, C-5). Kein automatisches Weiterleiten, solange die Seite offen ist.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { createLogger } from '../../lib/logger'
import { PASSWORD_MESSAGES, PASSWORD_HINT, checkNewPassword, mapAuthError } from '../../lib/passwordPolicy'
import { isRecoverySession, clearRecovery, recoveryLinkError } from '../../lib/passwordRecovery'
import { PasswordField } from '../../components/auth/PasswordField'
import { ForgotPasswordForm } from '../../components/auth/ForgotPasswordForm'
import { Button } from '../../components/ui/Button'

const logger = createLogger('PasswordResetScreen')

export function PasswordResetScreen() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)   // null | 'all' | 'partial'

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setError(null)
    const local = checkNewPassword(next, repeat)
    if (local) { setError(PASSWORD_MESSAGES[local]); return }

    setBusy(true)
    // Die Recovery-Sitzung ist der Nachweis – kein aktuelles Passwort (Verhalten mit
    // „Require current password“ beim Test prüfen, Ergebnis im Bericht)
    const { error: updateError } = await supabase.auth.updateUser({ password: next })
    if (updateError) {
      setBusy(false)
      logger.warn('password_reset_failed', { code: updateError.code ?? 'unknown', status: updateError.status ?? null })
      setError(PASSWORD_MESSAGES[mapAuthError(updateError)] ?? PASSWORD_MESSAGES.generic)
      return
    }
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'others' })
    if (signOutError) logger.warn('signout_others_failed', { code: signOutError.code ?? 'unknown' })
    logger.info('password_reset_done')
    clearRecovery()
    setBusy(false)
    setDone(signOutError ? 'partial' : 'all')
  }

  const valid = !!user && isRecoverySession() && !recoveryLinkError

  return (
    <div className="min-h-screen bg-bg flex flex-col max-w-lg mx-auto px-6 py-12">
      <span className="font-display text-[22px] text-ink mb-8">Friedensstifter</span>
      <h1 className="font-display text-[24px] text-ink mb-2">Neues Passwort</h1>

      {loading ? (
        <p className="text-[13px] text-ink-3">Wird vorbereitet…</p>
      ) : done ? (
        <div className="flex flex-col gap-5">
          <p role="status" className="text-[15px] text-ink-2 leading-relaxed bg-accent-light rounded-xl p-4">
            {done === 'all'
              ? 'Dein neues Passwort ist gespeichert. Auf anderen Geräten bist du jetzt abgemeldet.'
              : 'Dein neues Passwort ist gespeichert. Melde dich auf anderen Geräten bitte einmal neu an.'}
          </p>
          <Button variant="primary" className="w-full py-3" onClick={() => navigate('/home', { replace: true })}>Weiter in die App</Button>
        </div>
      ) : !valid ? (
        <div className="flex flex-col gap-5">
          <p className="text-[15px] text-ink-2 leading-relaxed">
            Der Link ist abgelaufen oder wurde schon benutzt. Fordere einfach einen neuen an.
          </p>
          <ForgotPasswordForm onCancel={() => navigate('/auth', { replace: true })} />
        </div>
      ) : (
        <>
          <p className="text-[14px] text-ink-2 leading-relaxed mb-6">Lege jetzt ein neues Passwort fest.</p>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <PasswordField id="reset-new" label="Neues Passwort" value={next} onChange={setNext} autoComplete="new-password" hint={PASSWORD_HINT} />
            <PasswordField id="reset-repeat" label="Neues Passwort wiederholen" value={repeat} onChange={setRepeat} autoComplete="new-password" />
            {error && <p role="alert" className="text-[13px] text-coral">{error}</p>}
            <Button type="submit" variant="primary" className="w-full py-4 mt-1" disabled={busy || !next || !repeat}>
              {busy ? 'Wird gespeichert…' : 'Passwort speichern'}
            </Button>
          </form>
        </>
      )}
    </div>
  )
}
