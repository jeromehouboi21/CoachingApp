import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Step1Welcome } from './Step1Welcome'
import { Step2Question } from './Step2Question'
import { Step3Reveal } from './Step3Reveal'
import { Step3bAgreement } from './Step3bAgreement'
import { Step4Auth } from './Step4Auth'
import { InvitedSetPassword } from './InvitedSetPassword'

export function OnboardingFlow() {
  const { user, loading } = useAuth()
  const [step, setStep] = useState(1)
  const [selectedArea, setSelectedArea] = useState(null)
  const navigate = useNavigate()

  const next = () => setStep(s => s + 1)
  const goToApp = () => navigate('/home')

  // Kurz warten, bis useAuth weiß, ob eine Invite-Session bereits besteht —
  // sonst würde kurz der falsche (volle) Flow aufblitzen.
  if (loading) return null

  // Eingeladene Nutzer sind durch den Invite-Link bereits authentifiziert.
  // Sie überspringen Kennenlernen/Bereichswahl (Step 1–3) und durchlaufen
  // nur Vereinbarung + Passwort-Vergabe.
  if (user) {
    return (
      <div className="min-h-screen bg-bg max-w-lg mx-auto relative overflow-hidden">
        {step === 1 && <Step3bAgreement onNext={next} current={1} total={2} />}
        {step === 2 && <InvitedSetPassword onSuccess={goToApp} />}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg max-w-lg mx-auto relative overflow-hidden">
      {step === 1 && <Step1Welcome onNext={next} onSkip={goToApp} />}
      {step === 2 && <Step2Question onNext={next} selectedArea={selectedArea} setSelectedArea={setSelectedArea} />}
      {step === 3 && <Step3Reveal onNext={next} onSkip={goToApp} />}
      {step === 4 && <Step3bAgreement onNext={next} />}
      {step === 5 && <Step4Auth onSuccess={goToApp} onboardingData={{ area: selectedArea }} />}
    </div>
  )
}
