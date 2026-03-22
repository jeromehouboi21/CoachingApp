import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'

const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const StepDots = ({ current, total }) => (
  <div className="flex gap-2">
    {Array.from({ length: total }).map((_, i) => (
      <span key={i} className={`w-2 h-2 rounded-full transition-all ${i + 1 === current ? 'bg-accent w-4' : 'bg-ink-3'}`} />
    ))}
  </div>
)

export function Step4Auth({ onSuccess, onboardingData }) {
  const { signUp, signIn, sendMagicLink, updateProfile } = useAuth()
  const [mode, setMode] = useState('register') // register | login | magic
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState('')
  const [magicSent, setMagicSent] = useState(false)
  const [showInviteField, setShowInviteField] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [consentPrivacy, setConsentPrivacy] = useState(false)
  const [consentSensitive, setConsentSensitive] = useState(false)

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setLoading('register')
    try {
      await signUp(email, password)
      // Save onboarding data + consent
      const { data: { user }, } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').update({
          onboarding_completed: true,
          onboarding_data: onboardingData,
          consent_given_at: new Date().toISOString(),
          consent_version: '1.0',
        }).eq('id', user.id)

        // Einladungscode einlösen (optional)
        if (inviteCode.trim()) {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.access_token) {
            const res = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-invite-code`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': ANON_KEY,
                  'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ code: inviteCode.trim().toUpperCase() }),
              }
            )
            const result = await res.json()
            if (!result.ok) {
              // Code ungültig — Registrierung trotzdem fortsetzen (free plan)
              console.warn('Invite code invalid:', result.error)
            }
          }
        }
      }
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading('')
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading('login')
    try {
      await signIn(email, password)
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading('')
    }
  }

  const handleMagicLink = async (e) => {
    e.preventDefault()
    setError('')
    setLoading('magic')
    try {
      await sendMagicLink(email)
      setMagicSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading('')
    }
  }

  if (magicSent) {
    return (
      <div className="flex flex-col min-h-screen px-6 py-10 items-center justify-center text-center">
        <div className="text-5xl mb-6">📬</div>
        <h2 className="font-display text-[28px] text-ink mb-3">Schau in dein Postfach</h2>
        <p className="text-[15px] text-ink-2">Wir haben dir einen Link an <strong>{email}</strong> geschickt.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen px-6 py-10 animate-[fadeSlideUp_0.4s_ease]">
      <div className="flex items-center justify-between mb-10">
        <span className="font-display text-[28px] text-ink">Friedensstifter</span>
        <StepDots current={4} total={4} />
      </div>

      <div className="mb-8">
        <h1 className="font-display text-[24px] text-ink mb-2">Dein persönlicher Raum</h1>
        <p className="text-[14px] text-ink-2">Alles, was du hier teilst, bleibt bei dir. Keine Weitergabe. Keine Werbung.</p>
      </div>

      {mode === 'magic' ? (
        <form onSubmit={handleMagicLink} className="flex flex-col gap-3 flex-1">
          <input
            type="email"
            placeholder="E-Mail-Adresse"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full bg-surface border border-[var(--color-border)] rounded-lg px-4 py-3 text-[15px] text-ink placeholder:text-ink-3 outline-none focus:border-accent transition-colors"
          />
          {error && <p className="text-[13px] text-coral">{error}</p>}
          <Button type="submit" variant="primary" className="w-full py-4 text-base" disabled={!!loading}>
            {loading ? 'Wird gesendet…' : 'Link per E-Mail erhalten'}
          </Button>
          <button type="button" onClick={() => setMode('register')} className="text-[13px] text-ink-3 text-center hover:text-ink-2">
            Zurück zur Registrierung
          </button>
        </form>
      ) : (
        <form onSubmit={mode === 'register' ? handleRegister : handleLogin} className="flex flex-col gap-3 flex-1">
          <input
            type="email"
            placeholder="E-Mail-Adresse"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full bg-surface border border-[var(--color-border)] rounded-lg px-4 py-3 text-[15px] text-ink placeholder:text-ink-3 outline-none focus:border-accent transition-colors"
          />
          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full bg-surface border border-[var(--color-border)] rounded-lg px-4 py-3 text-[15px] text-ink placeholder:text-ink-3 outline-none focus:border-accent transition-colors"
          />
          {mode === 'register' && (
            <div>
              {!showInviteField ? (
                <button
                  type="button"
                  onClick={() => setShowInviteField(true)}
                  className="text-[12px] text-ink-3 hover:text-ink-2 transition-colors"
                >
                  + Einladungscode eingeben
                </button>
              ) : (
                <input
                  type="text"
                  placeholder="Einladungscode (optional)"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  className="w-full bg-surface border border-[var(--color-border)] rounded-lg px-4 py-3 text-[15px] text-ink placeholder:text-ink-3 outline-none focus:border-accent transition-colors tracking-widest"
                />
              )}
            </div>
          )}

          {mode === 'register' && (
            <div className="flex flex-col gap-3 mt-1">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentPrivacy}
                  onChange={e => setConsentPrivacy(e.target.checked)}
                  className="mt-0.5 flex-shrink-0 accent-[var(--color-accent)]"
                />
                <span className="text-[13px] text-ink-2 leading-snug">
                  Ich habe die{' '}
                  <Link to="/datenschutz" target="_blank" className="text-accent underline">
                    Datenschutzerklärung
                  </Link>{' '}
                  gelesen und stimme der Verarbeitung meiner Daten zu.
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentSensitive}
                  onChange={e => setConsentSensitive(e.target.checked)}
                  className="mt-0.5 flex-shrink-0 accent-[var(--color-accent)]"
                />
                <span className="text-[13px] text-ink-2 leading-snug">
                  Ich stimme ausdrücklich der Verarbeitung meiner Gesprächsinhalte zu, die Informationen zu meinem emotionalen Erleben enthalten können (Art. 9 Abs. 2 lit. a DS-GVO).
                </span>
              </label>
            </div>
          )}

          {error && <p className="text-[13px] text-coral">{error}</p>}
          <Button
            type="submit"
            variant="primary"
            className="w-full py-4 text-base"
            disabled={!!loading || (mode === 'register' && (!consentPrivacy || !consentSensitive))}
          >
            {loading ? 'Lädt…' : mode === 'register' ? 'Loslegen — kostenlos' : 'Einloggen'}
          </Button>

          <div className="flex items-center gap-3 my-2">
            <span className="flex-1 h-px bg-[var(--color-border)]" />
            <span className="text-[12px] text-ink-3">oder</span>
            <span className="flex-1 h-px bg-[var(--color-border)]" />
          </div>

          <Button type="button" variant="secondary" className="w-full py-3" onClick={() => setMode('magic')}>
            Link per E-Mail erhalten
          </Button>

          <button
            type="button"
            onClick={() => setMode(mode === 'register' ? 'login' : 'register')}
            className="text-[13px] text-ink-3 text-center hover:text-ink-2 transition-colors"
          >
            {mode === 'register' ? 'Ich habe bereits ein Konto' : 'Noch kein Konto? Registrieren'}
          </button>
        </form>
      )}
    </div>
  )
}
