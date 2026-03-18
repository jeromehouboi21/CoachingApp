import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'

export function WelcomeScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleStart = async () => {
    if (user) {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id)
    }
    navigate('/home')
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 text-center max-w-lg mx-auto animate-[fadeSlideUp_0.4s_ease]">
      <div className="w-12 h-12 rounded-full bg-accent-light flex items-center justify-center mb-6">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M5 12l5 5L20 7" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <h1 className="font-display text-[28px] text-ink mb-5 leading-[1.2]">
        Schön, dass du da bist.
      </h1>

      <p className="text-[16px] text-ink-2 leading-[1.7] max-w-xs mb-8">
        Das hier ist dein persönlicher Raum.<br />
        Kein Urteil. Keine Ratschläge.<br />
        Nur Fragen, die dich anders denken lassen.
      </p>

      <p className="text-[14px] text-ink-3 leading-relaxed max-w-xs mb-10">
        Wenn du wissen möchtest wie die App funktioniert, findest du alles unter „Wie es funktioniert" im Profil.
      </p>

      <Button variant="primary" className="w-full max-w-xs py-4 text-base" onClick={handleStart}>
        Zur App →
      </Button>
    </div>
  )
}
