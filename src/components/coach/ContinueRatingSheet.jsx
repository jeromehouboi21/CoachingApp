// Einschätzung nach einem Weiterarbeiten-Gespräch (UX-Konzept 4.2c, U5a, E-U5a-5).
// Einmalig, überspringbar – die einzige Stelle, an der die App aktiv nach einer Einschätzung fragt.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { rateInsight } from '../../lib/insightActions'
import { RATING_OPTIONS } from '../insights/InsightRating'

export function ContinueRatingSheet({ insight, onDone }) {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const choose = async (value) => {
    setBusy(true)
    setFailed(false)
    const { ok } = await rateInsight(insight.insightId, value)
    setBusy(false)
    if (ok) onDone()
    else setFailed(true)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Deine Einschätzung">
      <div className="absolute inset-0 bg-black/40" onClick={onDone} />
      <div className="relative bg-surface w-full max-w-lg rounded-t-2xl p-6 pb-10">
        <p className="text-[15px] text-ink leading-relaxed mb-1">
          Du hast heute an „{insight.content}“ weitergearbeitet.
        </p>
        <p className="text-[14px] text-ink-2 mb-4">Wie siehst du diese Erkenntnis jetzt?</p>
        <div className="flex flex-col gap-2 mb-3">
          {RATING_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => choose(o.value)}
              disabled={busy}
              className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--color-border)] text-ink-2 hover:bg-surface-2 disabled:opacity-60"
            >
              <span className="w-5 text-center text-[15px]">{o.symbol}</span>
              <span className="text-[15px]">{o.label}</span>
            </button>
          ))}
        </div>
        {failed && (
          <p role="alert" className="text-[13px] text-ink-2 mb-3">Das hat gerade nicht geklappt. Versuch es bitte noch einmal.</p>
        )}
        <button onClick={onDone} className="w-full text-[13px] text-ink-3 text-center py-2">Überspringen</button>
      </div>
    </div>,
    document.body,
  )
}
