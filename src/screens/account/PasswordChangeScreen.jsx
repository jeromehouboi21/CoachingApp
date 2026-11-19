// Profil → Passwort (Paket K, W1, Weg A). Route /profil/passwort (geschützt).
// Absicherung K-5: aktuelles Passwort (Dashboard „Require current password when updating“).
// Danach werden andere Geräte abgemeldet. Kein Erfolgshinweis ohne bestätigten Erfolg.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { createLogger } from '../../lib/logger'
import { PASSWORD_MESSAGES, PASSWORD_HINT, checkNewPassword, mapAuthError } from '../../lib/passwordPolicy'
import { PasswordField } from '../../components/auth/PasswordField'
import { ForgotPasswordForm } from '../../components/auth/ForgotPasswordForm'
import { Button } from '../../components/ui/Button'

const logger = createLogger('PasswordChangeScreen')

export function PasswordChangeScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)   // null | 'all' | 'partial'
  const [showForgot, setShowForgot] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setError(null)
    const local = checkNewPassword(next, repeat)
    if (local) { setError(PASSWORD_MESSAGES[local]); return }
    if (!current) { setError(PASSWORD_MESSAGES.current_password_wrong); return }

    setBusy(true)
    const { error: updateError } = await supabase.auth.updateUser({ password: next, current_password: current })
    if (updateError) {
      setBusy(false)
      logger.warn('password_change_failed', { code: updateError.code ?? 'unknown', status: updateError.status ?? null })
      setError(PASSWORD_MESSAGES[mapAuthError(updateError)] ?? PASSWORD_MESSAGES.generic)
      return
    }
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'others' })
    if (signOutError) logger.warn('signout_others_failed', { code: signOutError.code ?? 'unknown' })
    logger.info('password_changed')
    setBusy(false)
    setCurrent(''); setNext(''); setRepeat('')
    setDone(signOutError ? 'partial' : 'all')
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col max-w-lg mx-auto px-6 py-10">
      <button
        onClick={() => navigate('/profile')}
        className="flex items-center gap-2 text-ink-3 hover:text-ink-2 transition-colors mb-8 self-start"
      >
        <ChevronLeft size={18} />
        <span className="text-[14px]">Zurück</span>
      </button>

      <h1 className="font-display text-[24px] text-ink mb-2">Passwort ändern</h1>

      {done ? (
        <div className="flex flex-col gap-5">
          <p role="status" className="text-[15px] text-ink-2 leading-relaxed bg-accent-light rounded-xl p-4">
            {done === 'all'
              ? 'Dein Passwort ist geändert. Auf anderen Geräten bist du jetzt abgemeldet.'
              : 'Dein Passwort ist geändert. Melde dich auf anderen Geräten bitte einmal neu an.'}
          </p>
          <Button variant="primary" className="w-full py-3" onClick={() => navigate('/profile')}>Zurück zum Profil</Button>
        </div>
      ) : (
        <>
          <p className="text-[14px] text-ink-2 leading-relaxed mb-6">
            Gib dein aktuelles Passwort ein und lege ein neues fest. Danach meldet die App dich auf anderen Geräten ab.
          </p>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <PasswordField id="pw-current" label="Aktuelles Passwort" value={current} onChange={setCurrent} autoComplete="current-password" />
            <PasswordField id="pw-new" label="Neues Passwort" value={next} onChange={setNext} autoComplete="new-password" hint={PASSWORD_HINT} />
            <PasswordField id="pw-repeat" label="Neues Passwort wiederholen" value={repeat} onChange={setRepeat} autoComplete="new-password" />
            {error && <p role="alert" className="text-[13px] text-coral">{error}</p>}
            <Button type="submit" variant="primary" className="w-full py-4 mt-1" disabled={busy || !current || !next || !repeat}>
              {busy ? 'Wird gespeichert…' : 'Passwort ändern'}
            </Button>
          </form>

          <div className="mt-8 border-t border-[var(--color-border)] pt-5">
            {showForgot ? (
              <ForgotPasswordForm fixedEmail={user?.email ?? null} onCancel={() => setShowForgot(false)} />
            ) : (
              <button onClick={() => setShowForgot(true)} className="text-[13px] text-accent text-left hover:underline">
                Noch kein Passwort oder vergessen? Wir schicken dir einen Link ›
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
