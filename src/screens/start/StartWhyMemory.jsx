// Screen 2 – Warum sich die App etwas merkt (Paket K W3, Konzept 2.3). Inhalt = WhyMemoryBlock (W2),
// „Wie wir deine Daten schützen ›“ öffnet die Sicherheitsseite als Sheet.
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { WhyMemoryBlock } from '../../components/WhyMemoryBlock'
import { SecurityInfoSheet } from '../legal/SecurityInfoScreen'
import { StartDots } from './StartDots'

export function StartWhyMemory({ onNext }) {
  const [securityOpen, setSecurityOpen] = useState(false)
  return (
    <div className="min-h-screen bg-bg max-w-lg mx-auto flex flex-col px-6 py-10 animate-[fadeSlideUp_0.4s_ease]">
      <StartDots current={2} />
      <WhyMemoryBlock showSecurityLink={false} />
      <div className="mt-auto pt-8 flex flex-col gap-3 pb-4">
        <button onClick={() => setSecurityOpen(true)} className="text-[14px] text-accent hover:underline text-left">
          Wie wir deine Daten schützen ›
        </button>
        <Button variant="primary" className="w-full text-base py-4" onClick={onNext}>Weiter</Button>
      </div>
      {securityOpen && <SecurityInfoSheet onClose={() => setSecurityOpen(false)} />}
    </div>
  )
}
