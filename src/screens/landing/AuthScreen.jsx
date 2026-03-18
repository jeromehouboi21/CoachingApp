import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'

export function AuthScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialMode = searchParams.get('mode') === 'login' ? 'login' : 'register'

  const { signUp, signIn, sendMagicLink } = useAuth()
  const [mode, setMode] = useState(initialMode) // register | login | magic
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [magicSent, setMagicSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'register') {
        await signUp(email, password)
        navigate('/welcome')
      } else {
        await signIn(email, password)
        navigate('/home')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLink = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await sendMagicLink(email)
      setMagicSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (magicSent) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 text-center max-w-lg mx-auto">
        <div className="text-5xl mb-6">📬</div>
        <h2 className="font-display text-[28px] text-ink mb-3">Schau in dein Postfach</h2>
        <p className="text-[15px] text-ink-2 leading-relaxed">
          Wir haben dir einen Link an <strong>{email}</strong> geschickt.
        </p>
        <button
          onClick={() => setMagicSent(false)}
          className="mt-6 text-[13px] text-ink-3 hover:text-ink-2"
        >
          Andere E-Mail verwenden
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col max-w-lg mx-auto px-6 py-10">
      {/* Zurück */}
      <button
        onClick={() => navigate('/landing')}
        className="flex items-center gap-2 text-ink-3 hover:text-ink-2 transition-colors mb-10 self-start"
      >
        <ArrowLeft size={18} />
        <span className="text-[14px]">Zurück</span>
      </button>

      <div className="flex-1">
        <h1 className="font-display text-[26px] text-ink mb-2">Dein persönlicher Raum</h1>
        <p className="text-[14px] text-ink-2 mb-8">
          Alles, was du hier teilst, bleibt bei dir. Keine Weitergabe. Keine Werbung.
        </p>

        {mode === 'magic' ? (
          <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
            <div>
              <label className="text-[12px] text-ink-3 font-medium uppercase tracking-wide block mb-1.5">E-Mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="deine@email.de"
                className="w-full bg-surface border border-[var(--color-border)] rounded-lg px-4 py-3 text-[15px] text-ink placeholder:text-ink-3 outline-none focus:border-accent transition-colors"
              />
            </div>
            {error && <p className="text-[13px] text-coral">{error}</p>}
            <Button type="submit" variant="primary" className="w-full py-4 mt-2" disabled={loading}>
              {loading ? 'Wird gesendet…' : 'Link per E-Mail — kein Passwort nötig'}
            </Button>
            <button type="button" onClick={() => setMode('register')} className="text-[13px] text-ink-3 text-center hover:text-ink-2">
              Zurück zur Registrierung
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className="text-[12px] text-ink-3 font-medium uppercase tracking-wide block mb-1.5">E-Mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="deine@email.de"
                className="w-full bg-surface border border-[var(--color-border)] rounded-lg px-4 py-3 text-[15px] text-ink placeholder:text-ink-3 outline-none focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="text-[12px] text-ink-3 font-medium uppercase tracking-wide block mb-1.5">Passwort</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="Mindestens 8 Zeichen"
                  className="w-full bg-surface border border-[var(--color-border)] rounded-lg px-4 py-3 pr-12 text-[15px] text-ink placeholder:text-ink-3 outline-none focus:border-accent transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink-2"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && <p className="text-[13px] text-coral">{error}</p>}
            <Button type="submit" variant="primary" className="w-full py-4 mt-2" disabled={loading}>
              {loading ? 'Lädt…' : mode === 'register' ? 'Konto erstellen — kostenlos' : 'Anmelden'}
            </Button>

            <div className="flex items-center gap-3 my-1">
              <span className="flex-1 h-px bg-[var(--color-border)]" />
              <span className="text-[12px] text-ink-3">oder</span>
              <span className="flex-1 h-px bg-[var(--color-border)]" />
            </div>

            <Button type="button" variant="secondary" className="w-full py-3" onClick={() => setMode('magic')}>
              Link per E-Mail — kein Passwort nötig
            </Button>

            <p className="text-[12px] text-ink-3 text-center mt-1">
              Mit der Registrierung stimmst du unserer{' '}
              <span className="underline cursor-pointer">Datenschutzerklärung</span> zu.
            </p>

            <button
              type="button"
              onClick={() => setMode(mode === 'register' ? 'login' : 'register')}
              className="text-[13px] text-ink-3 text-center hover:text-ink-2 transition-colors"
            >
              {mode === 'register' ? 'Bereits ein Konto? Anmelden' : 'Noch kein Konto? Registrieren'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
