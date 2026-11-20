// Übergangstext 3 (UX-Konzept 5.4, U4): Ruhemodus beim Versuch, ein neues Gespräch zu beginnen.
// Ersetzt das frühere Limit-Modal. Kein Verknappungsdruck, sichtbarer Ausweg.
// Paket Z: Mit quota (Monatskontingent der Begleitung aufgebraucht) eigener Textzweig mit Datum.
// quota = { periodEnd, tier } | null
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { INTENSIV_ENABLED } from '../../content/legalTexts'
import { shortDate } from '../../content/plans'

export function RestModeSheet({ onClose, quota = null }) {
  const navigate = useNavigate()
  const date = quota ? shortDate(quota.periodEnd) : null
  const offerIntensiv = !!quota && quota.tier === 'begleitung' && INTENSIV_ENABLED

  let text = 'Für ein neues Gespräch gibt es die Begleitung. Deine Erkenntnisse bleiben dir so oder so.'
  if (quota) {
    text = date
      ? `Für diesen Monat sind deine Nachrichten aufgebraucht. Ab dem ${date} kannst du wieder neue Gespräche beginnen. Deine Erkenntnisse bleiben dir so oder so.`
      : 'Für diesen Monat sind deine Nachrichten aufgebraucht. Mit dem nächsten Monat kannst du wieder neue Gespräche beginnen. Deine Erkenntnisse bleiben dir so oder so.'
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Ein neues Gespräch">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-surface w-full max-w-lg rounded-t-2xl p-6 pb-10">
        <p className="text-[15px] text-ink leading-relaxed mb-5">{text}</p>
        <div className="flex flex-col gap-3">
          {(!quota || offerIntensiv) && (
            <button
              onClick={() => navigate('/begleitung')}
              className="w-full bg-accent text-white py-3 rounded-full font-medium hover:bg-accent-2 transition-colors"
            >
              {quota ? 'Begleitung intensiv →' : 'Begleitung →'}
            </button>
          )}
          <button
            onClick={() => navigate('/mirror')}
            className="w-full border border-[var(--color-border)] text-ink py-3 rounded-full font-medium"
          >
            Zurück zum Spiegel
          </button>
          <button onClick={onClose} className="text-[13px] text-ink-3 text-center">Schließen</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
