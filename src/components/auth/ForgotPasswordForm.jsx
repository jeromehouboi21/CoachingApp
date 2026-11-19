// „Passwort vergessen“ (Paket K, W1, Weg B): Link zum Festlegen eines neuen Passworts anfordern.
// Antwort für jede Adresse gleich – kein Rückschluss darauf, ob es ein Konto gibt (Angriffstest K3).
// fixedEmail: im Profil die Adresse des Kontos, nicht änderbar.
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { createLogger } from '../../lib/logger'
import { PASSWORD_MESSAGES, isRateLimit } from '../../lib/passwordPolicy'
import { Button } from '../ui/Button'

const logger = createLogger('ForgotPasswordForm')

export const RESET_SENT_TEXT = 'Wenn es ein Konto mit dieser Adresse gibt, haben wir dir einen Link geschickt. Schau auch im Spam-Ordner nach.'

export function ForgotPasswordForm({ fixedEmail = null, onCancel }) {
  const [email, setEmail] = useState(fixedEmail ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!email.trim() || busy) return
    setBusy(true)
    setError(null)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/passwort-neu`,
    })
    setBusy(false)
    if (resetError && isRateLimit(resetError)) {
      setError(PASSWORD_MESSAGES.rate_limited)
      return
    }
    if (resetError) logger.warn('password_reset_request_failed', { code: resetError.code ?? 'unknown' })
    // Immer derselbe Text, egal ob es das Konto gibt
    setSent(true)
  }

  if (sent) {
    return <p role="status" className="text-[14px] text-ink-2 leading-relaxed bg-surface-2 rounded-lg px-4 py-3">{RESET_SENT_TEXT}</p>
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      {fixedEmail ? (
        <p className="text-[13px] text-ink-2 leading-relaxed">
          Wir schicken einen Link an <span className="text-ink font-medium">{fixedEmail}</span>. Damit legst du ein neues Passwort fest.
        </p>
      ) : (
        <div>
          <label htmlFor="forgot-email" className="text-[12px] text-ink-3 font-medium uppercase tracking-wide block mb-1.5">E-Mail</label>
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="deine@email.de"
            className="w-full bg-surface border border-[var(--color-border)] rounded-lg px-4 py-3 text-[15px] text-ink placeholder:text-ink-3 outline-none focus:border-accent transition-colors"
          />
        </div>
      )}
      {error && <p role="alert" className="text-[13px] text-coral">{error}</p>}
      <Button type="submit" variant="primary" className="w-full py-3" disabled={busy || !email.trim()}>
        {busy ? 'Wird gesendet…' : 'Link schicken'}
      </Button>
      {onCancel && (
        <button type="button" onClick={onCancel} className="text-[13px] text-ink-3 text-center hover:text-ink-2">
          Zurück
        </button>
      )}
    </form>
  )
}
