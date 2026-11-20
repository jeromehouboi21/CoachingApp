// Paket Z (Handoff 5.2): ruhige Hinweiszeile zum Monatskontingent der Begleitung.
// Erscheint nur beim Hinweis ab 80 % (einmal je Zeitraum), in der Kulanz und an der Grenze.
// Kein ständiger Zähler, keine Verknappung. Texte: Vorschläge zur Freigabe durch Jerome.
import { useNavigate } from 'react-router-dom'
import { INTENSIV_ENABLED } from '../../content/legalTexts'
import { shortDate } from '../../content/plans'

export function QuotaNotice({ kind, remaining, periodEnd, tier }) {
  const navigate = useNavigate()
  const date = shortDate(periodEnd)
  let text
  if (kind === 'warn') {
    text = `Noch ${remaining} Nachrichten in diesem Monat.`
  } else if (kind === 'grace') {
    text = 'Für diesen Monat sind deine Nachrichten aufgebraucht. Dieses Gespräch kannst du noch in Ruhe abschließen.'
  } else {
    text = date
      ? `Für diesen Monat sind deine Nachrichten aufgebraucht. Ab dem ${date} geht es weiter.`
      : 'Für diesen Monat sind deine Nachrichten aufgebraucht. Mit dem nächsten Monat geht es weiter.'
  }
  const offerIntensiv = kind === 'reached' && tier === 'begleitung' && INTENSIV_ENABLED
  return (
    <div role="status" className="mx-5 mb-3 bg-accent-light rounded-xl p-4">
      <p className="text-[14px] text-ink-2 leading-relaxed">{text}</p>
      {offerIntensiv && (
        <button onClick={() => navigate('/begleitung')} className="text-[13px] text-accent font-medium mt-3">
          Begleitung intensiv →
        </button>
      )}
    </div>
  )
}
