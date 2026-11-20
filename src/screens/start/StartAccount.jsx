// Screen 4 – Dein Zugang (Paket K W3, Konzept 2.5; ersetzt Step4Auth)
// Die Zustimmung aus Screen 3 reist als Signup-Metadaten mit; handle_new_user setzt die Felder
// serverseitig und nur für Version 2.0 (Migration 040). Kein Client-Schreiben der Zustimmung.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'
import { PasswordField } from '../../components/auth/PasswordField'
import { createLogger } from '../../lib/logger'
import { functionHeaders, functionUrl } from '../../lib/functions'
import { PASSWORD_HINT, PASSWORD_MESSAGES, checkNewPassword, mapAuthError } from '../../lib/passwordPolicy'
import { CONSENT_VERSION, AGREEMENT_VERSION } from '../../content/legalTexts'

const logger = createLogger('StartAccount')
const inputClass = 'w-full bg-surface border border-[var(--color-border)] rounded-lg px-4 py-3 text-[15px] text-ink placeholder:text-ink-3 outline-none focus:border-accent transition-colors'

export function StartAccount() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [checkMail, setCheckMail] = useState(false)

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!ageConfirmed) return   // zweite Linie zum inaktiven Button
    setError('')
    const tooShort = checkNewPassword(password)
    if (tooShort) { setError(PASSWORD_MESSAGES[tooShort]); return }
    setBusy(true)
    try {
      const data = await signUp(email, password, undefined, {
        onboarding_completed: true,
        age_confirmed: true,                  // → age_confirmed_at (Migration 036)
        consent_version: CONSENT_VERSION,     // '2.0'
        agreement_version: AGREEMENT_VERSION, // '2.0'
        consent_art9: true,
        agreement_accepted: true,
      })
      if (!data.user?.id) throw new Error('signup_without_user')
      const accessToken = data.session?.access_token
      const code = inviteCode.trim().toUpperCase()

      if (code && accessToken) {
        try {
          const res = await fetch(functionUrl('validate-invite-code'), {
            method: 'POST',
            headers: functionHeaders(accessToken),
            body: JSON.stringify({ code }),
          })
          const result = await res.json()
          if (!result.ok) logger.warn('Invite code rejected', { status: res.status, reason: result.error ?? null })
        } catch (inviteErr) {
          logger.warn('Invite code request failed', { errorType: inviteErr?.name ?? 'Error' })
        }
      } else if (code) {
        // E-Mail-Bestätigung aktiv: Code nach dem ersten Login einlösen (useAuth)
        localStorage.setItem('pendingInviteCode', code)
      }

      if (accessToken) navigate('/home', { replace: true })
      else setCheckMail(true)
    } catch (err) {
      const key = err?.code === 'user_already_exists' ? 'exists' : mapAuthError(err)
      logger.warn('signup_failed', { code: err?.code ?? 'unknown' })
      setError(key === 'exists'
        ? 'Zu dieser E-Mail gibt es schon ein Konto. Melde dich einfach an.'
        : PASSWORD_MESSAGES[key] ?? PASSWORD_MESSAGES.generic)
    } finally {
      setBusy(false)
    }
  }

  if (checkMail) {
    return (
      <div className="min-h-screen bg-bg max-w-lg mx-auto flex flex-col px-6 py-10 items-center justify-center text-center">
        <div className="text-5xl mb-6" aria-hidden="true">📬</div>
        <h2 className="font-display text-[28px] text-ink mb-3">Bestätige deine E-Mail</h2>
        <p className="text-[15px] text-ink-2 leading-relaxed mb-6">
          Wir haben dir einen Link an <strong>{email}</strong> geschickt. Danach kannst du dich anmelden.
        </p>
        <button onClick={() => navigate('/auth?mode=login')} className="text-[14px] text-accent hover:underline">
          Zur Anmeldung
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg max-w-lg mx-auto flex flex-col px-6 py-10 animate-[fadeSlideUp_0.4s_ease]">
      <div className="mb-10">
        <span className="font-display text-[24px] text-ink">Friedensstifter</span>
      </div>
      <h1 className="font-display text-[26px] text-ink mb-6">Dein Zugang</h1>

      <form onSubmit={handleRegister} className="flex flex-col gap-4 flex-1">
        <div>
          <label htmlFor="start-email" className="text-[12px] text-ink-3 font-medium uppercase tracking-wide block mb-1.5">E-Mail</label>
          <input id="start-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" className={inputClass} />
        </div>
        <PasswordField id="start-password" label="Passwort" value={password} onChange={setPassword} autoComplete="new-password" hint={PASSWORD_HINT} />

        <label className="flex items-start gap-3 cursor-pointer mt-1">
          <input
            type="checkbox"
            checked={ageConfirmed}
            onChange={e => setAgeConfirmed(e.target.checked)}
            className="mt-0.5 flex-shrink-0 accent-[var(--color-accent)]"
          />
          <span className="text-[13px] text-ink-2 leading-snug">
            <span className="text-ink font-medium">Ich bin mindestens 18 Jahre alt.</span>{' '}
            Friedensstifter ist für Erwachsene gedacht. Wenn du jünger bist und gerade jemanden zum Reden brauchst, ist die Nummer gegen Kummer für dich da: <span className="text-ink font-medium">116 111</span>, kostenlos und anonym.
          </span>
        </label>

        <div>
          {!showInvite ? (
            <button type="button" onClick={() => setShowInvite(true)} className="text-[13px] text-ink-3 hover:text-ink-2">
              Einladungscode eingeben +
            </button>
          ) : (
            <input
              type="text"
              placeholder="Einladungscode (optional)"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value.toUpperCase())}
              className={`${inputClass} tracking-widest`}
            />
          )}
        </div>

        {error && <p role="alert" className="text-[13px] text-ink-2 bg-surface-2 rounded-lg px-4 py-3">{error}</p>}

        <Button type="submit" variant="primary" className="w-full py-4 text-base mt-2" disabled={busy || !ageConfirmed}>
          {busy ? 'Lädt…' : 'Konto erstellen'}
        </Button>

        <div className="flex items-center justify-center gap-4 mt-auto pt-6">
          <Link to="/impressum" target="_blank" rel="noopener noreferrer" className="text-[11px] text-ink-3 hover:text-ink-2">Impressum</Link>
          <span className="w-1 h-1 rounded-full bg-ink-3" />
          <Link to="/datenschutz" target="_blank" rel="noopener noreferrer" className="text-[11px] text-ink-3 hover:text-ink-2">Datenschutzerklärung</Link>
        </div>
      </form>
    </div>
  )
}
