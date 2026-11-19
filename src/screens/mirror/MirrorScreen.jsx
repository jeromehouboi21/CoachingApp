import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ProfileButton } from '../../components/layout/ProfileButton'
import { InsightsLevel } from './InsightsLevel'
import { PatternsLevel } from './PatternsLevel'
import { DevelopmentLevel } from './DevelopmentLevel'

// Spiegel mit drei Ebenen (U2, UX-Konzept 4.3): Erkenntnisse · Muster · Entwicklung.
// Jede Ebene hat eine eigene Route (E-U2-1), damit Zurück-Taste und Lesezeichen funktionieren.
// Keine Anzeige-Sperren: Was über dich entsteht, ist für dich sichtbar (Konzept 5.2, E-U2-7).
const LEVELS = [
  { id: 'erkenntnisse', label: 'Erkenntnisse', to: '/mirror' },
  { id: 'muster', label: 'Muster', to: '/mirror/muster' },
  { id: 'entwicklung', label: 'Entwicklung', to: '/mirror/entwicklung' },
]

export function MirrorScreen({ level = 'erkenntnisse' }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="px-5 pt-12 pb-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-[24px] text-ink">Spiegel</h1>
          <p className="text-[13px] text-ink-3 mt-0.5">Was du über dich verstanden hast</p>
        </div>
        <ProfileButton />
      </div>

      <div className="flex gap-1 bg-surface-2 p-1 rounded-full mb-5" role="tablist" aria-label="Ebenen des Spiegels">
        {LEVELS.map(l => (
          <button
            key={l.id}
            role="tab"
            aria-selected={level === l.id}
            onClick={() => level !== l.id && navigate(l.to)}
            className={`flex-1 text-[13px] font-medium py-1.5 rounded-full transition-all ${
              level === l.id ? 'bg-surface text-ink shadow-sm' : 'text-ink-3'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {level === 'erkenntnisse' && <InsightsLevel userId={user?.id} />}
      {level === 'muster' && <PatternsLevel userId={user?.id} />}
      {level === 'entwicklung' && <DevelopmentLevel userId={user?.id} />}
    </div>
  )
}
