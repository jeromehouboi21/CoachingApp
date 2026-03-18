import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Step1Welcome } from './Step1Welcome'
import { Step2Question } from './Step2Question'
import { Step3Reveal } from './Step3Reveal'
import { Step4Auth } from './Step4Auth'

export function OnboardingFlow() {
  const [step, setStep] = useState(1)
  const [selectedArea, setSelectedArea] = useState(null)
  const navigate = useNavigate()

  const next = () => setStep(s => s + 1)
  const goToApp = () => navigate('/home')

  return (
    <div className="min-h-screen bg-bg max-w-lg mx-auto relative overflow-hidden">
      {step === 1 && <Step1Welcome onNext={next} onSkip={goToApp} />}
      {step === 2 && <Step2Question onNext={next} selectedArea={selectedArea} setSelectedArea={setSelectedArea} />}
      {step === 3 && <Step3Reveal onNext={next} />}
      {step === 4 && <Step4Auth onSuccess={goToApp} onboardingData={{ area: selectedArea }} />}
    </div>
  )
}
