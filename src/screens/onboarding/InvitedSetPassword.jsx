import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const StepDots = ({ current, total }) => (
  <div className="flex gap-2">
    {Array.from({ length: total }).map((_, i) => (
      <span key={i} className={`w-2 h-2 rounded-full transition-all ${i + 1 === current ? 'bg-accent w-4' : 'bg-ink-3'}`} />
    ))}
  </div>
)

export function InvitedSetPassword({ onSuccess }) {
  const { updateProfile } = useAuth()
  const [password, setPassword] = useState('')
  const [consentPrivacy, setConsentPrivacy] = useState(false)
  const [consentSensitive, setConsentSensitive] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // Passwort für die bereits bestehende Invite-Session setzen.
      const { error: updateUserError } = await supabase.auth.updateUser({ password })
      if (updateUserError) throw updateUserError

      await updateProfile({
        onboarding_completed: true,
        consent_given_at: new Date().toISOString(),
        consent_version: '1.0',
        coaching_agreement_accepted_at: new Date().toISOString(),
        coaching_agreement_version: '1.0',
      })

      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen px-6 py-10 animate-[fadeSlideUp_0.4s_ease]">
      <div className="flex items-center justify-between mb-10">
        <span className="font-display text-[28px] text-ink">Friedensstifter</span>
        <StepDots current={2} total={2} />
      </div>

      <div className="mb-8">
        <h1 className="font-display text-[24px] text-ink mb-2">Dein persönlicher Raum</h1>
        <p className="text-[14px] text-ink-2">Leg ein Passwort fest, mit dem du dich künftig anmeldest.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 flex-1">
        <input
          type="password"
          placeholder="Passwort"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full bg-surface border border-[var(--color-border)] rounded-lg px-4 py-3 text-[15px] text-ink placeholder:text-ink-3 outline-none focus:border-accent transition-colors"
        />

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

        {error && <p className="text-[13px] text-coral">{error}</p>}

        <Button
          type="submit"
          variant="primary"
          className="w-full py-4 text-base"
          disabled={loading || !consentPrivacy || !consentSensitive || password.length < 6}
        >
          {loading ? 'Wird gespeichert…' : 'Loslegen'}
        </Button>
      </form>
    </div>
  )
}
