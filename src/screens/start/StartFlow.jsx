// Neuer Einstieg (Paket K W3, Konzept 2.1–2.6): /start/1 … /start/4
// Die Zustimmung aus Screen 3 lebt nur in diesem Zustand (kein localStorage). Die Route bleibt
// über alle vier Schritte dieselbe Komponente, der Zustand übersteht also den Wechsel 3 → 4.
// Neu laden oder /start/4 direkt → zurück auf /start/3.
import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ConsentStep } from '../../components/legal/ConsentStep'
import { DeclineSheet } from '../../components/legal/DeclineSheet'
import { StartExpect } from './StartExpect'
import { StartWhyMemory } from './StartWhyMemory'
import { StartAccount } from './StartAccount'
import { StartDots } from './StartDots'

export function StartFlow() {
  const { step } = useParams()
  const navigate = useNavigate()
  const [consented, setConsented] = useState(false)
  const [declineOpen, setDeclineOpen] = useState(false)

  if (step === '1') return <StartExpect onNext={() => navigate('/start/2')} />
  if (step === '2') return <StartWhyMemory onNext={() => navigate('/start/3')} />
  if (step === '3') {
    return (
      <div className="min-h-screen bg-bg max-w-lg mx-auto">
        <ConsentStep
          header={<StartDots current={3} />}
          onAccept={() => { setConsented(true); navigate('/start/4') }}
          onDecline={() => setDeclineOpen(true)}
        />
        {declineOpen && <DeclineSheet onClose={() => setDeclineOpen(false)} />}
      </div>
    )
  }
  if (step === '4') {
    if (!consented) return <Navigate to="/start/3" replace />
    return <StartAccount />
  }
  return <Navigate to="/start/1" replace />
}
