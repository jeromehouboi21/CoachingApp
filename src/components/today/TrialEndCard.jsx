// Übergangstext 2 (UX-Konzept 5.4, U4): Ende des Kennenlernens, einmalig als Karte auf Heute.
// Ehrlich, in Jeromes Stimme, ohne Verknappungsdruck; sichtbarer Ausweg „Schließen“.
import { useNavigate } from 'react-router-dom'
import { COACHING_CONTACT_URL } from '../../lib/accessState'

export function TrialEndCard({ onClose }) {
  const navigate = useNavigate()
  return (
    <div className="bg-surface border border-[var(--color-border)] rounded-xl p-5 mb-6">
      <p className="text-[14px] text-ink-2 leading-relaxed mb-3">
        Drei Gespräche liegen hinter dir. Was du erkannt hast, bleibt in deinem Spiegel, so lange du möchtest.
      </p>
      <p className="text-[14px] text-ink-2 leading-relaxed mb-4">
        Gespräche mit deinem Begleiter kosten mich Rechenleistung, deshalb kann ich sie nicht dauerhaft kostenlos anbieten. Wenn du weitermachen möchtest:
      </p>
      <div className="flex flex-col items-start gap-2">
        <button
          onClick={() => { onClose(); navigate('/begleitung') }}
          className="text-[14px] text-accent font-medium hover:underline"
        >
          Begleitung →
        </button>
        <a
          href={COACHING_CONTACT_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          className="text-[14px] text-accent font-medium hover:underline"
        >
          Oder ein persönliches Gespräch mit Jerome →
        </a>
      </div>
      <p className="text-[12px] text-ink-3 mt-4">— Jerome</p>
      <button onClick={onClose} className="text-[13px] text-ink-3 mt-3">Schließen</button>
    </div>
  )
}
