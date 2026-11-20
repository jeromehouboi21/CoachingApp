// Eingeladene (admin-invite-user): nach der Zustimmung das erste Passwort festlegen (Paket K W3-2).
// Reihenfolge: Passwort setzen → Zustimmung über RPC accept_consent_v2 (onConsent). Scheitert nur
// der zweite Schritt, wird beim nächsten Versuch nur er wiederholt. Kein Client-Schreiben der Zustimmung.
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { createLogger } from '../../lib/logger'
import { Button } from '../../components/ui/Button'
import { PasswordField } from '../../components/auth/PasswordField'
import { PASSWORD_HINT, PASSWORD_MESSAGES, checkNewPassword, mapAuthError } from '../../lib/passwordPolicy'

const logger = createLogger('InvitedSetPassword')

export function InvitedSetPassword({ onConsent }) {
  const [password, setPassword] = useState('')
  const [passwordSet, setPasswordSet] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!passwordSet) {
      const tooShort = checkNewPassword(password)
      if (tooShort) { setError(PASSWORD_MESSAGES[tooShort]); return }
    }
    setBusy(true)
    try {
      if (!passwordSet) {
        const { error: updateUserError } = await supabase.auth.updateUser({ password })
        if (updateUserError) {
          logger.warn('invite_password_failed', { code: updateUserError.code ?? 'unknown', status: updateUserError.status ?? null })
          const key = mapAuthError(updateUserError)
          setError(PASSWORD_MESSAGES[key === 'current_password_wrong' ? 'generic' : key])
          return
        }
        setPasswordSet(true)
      }
      await onConsent()   // wirft bei Fehler; Erfolg = Profil mit v2.0 neu geladen → App öffnet sich
    } catch {
      setError('Deine Zustimmung konnte gerade nicht gespeichert werden. Versuch es bitte noch einmal.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg max-w-lg mx-auto flex flex-col px-6 py-10 animate-[fadeSlideUp_0.4s_ease]">
      <div className="mb-10">
        <span className="font-display text-[24px] text-ink">Friedensstifter</span>
      </div>
      <h1 className="font-display text-[26px] text-ink mb-2">Dein Zugang</h1>
      <p className="text-[14px] text-ink-2 mb-6">Leg ein Passwort fest, mit dem du dich künftig anmeldest.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!passwordSet && (
          <PasswordField id="invite-password" label="Passwort" value={password} onChange={setPassword} autoComplete="new-password" hint={PASSWORD_HINT} />
        )}
        {error && <p role="alert" className="text-[13px] text-ink-2 bg-surface-2 rounded-lg px-4 py-3">{error}</p>}
        <Button type="submit" variant="primary" className="w-full py-4 text-base" disabled={busy || (!passwordSet && !password)}>
          {busy ? 'Wird gespeichert…' : passwordSet ? 'Nochmal versuchen' : 'Loslegen'}
        </Button>
      </form>
    </div>
  )
}
