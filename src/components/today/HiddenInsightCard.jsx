import { useState } from 'react'
import { Lock } from 'lucide-react'
import { SuggestionActions } from '../insights/SuggestionActions'
import { InsightRating } from '../insights/InsightRating'

// Verdeckte Erkenntnis auf Heute (UX-Konzept 4.1, Zustand B und C2, U3).
// Heute ist öffentlicher Raum: Text erst nach Antippen, Erklärzeile dauerhaft sichtbar.
// onReveal() wird beim Aufdecken aufgerufen (z. B. surfaced_at setzen).
// onDismiss: „Heute nicht“ (nur Nachklang). onSuggestionDone: Ergebnis von „Stimmt das so?“.
// continueLabel (U5a): Text für „Daran weiterarbeiten“ (Nachklang: „Wie war es seitdem? …“).
export function HiddenInsightCard({ heading, insight, onReveal, onDismiss, onSuggestionDone, continueLabel }) {
  const [revealed, setRevealed] = useState(false)
  const [content, setContent] = useState(insight.content)
  const [source, setSource] = useState(insight.source)
  const [rating, setRating] = useState(insight.user_rating ?? null)
  const [dismissFailed, setDismissFailed] = useState(false)

  const reveal = () => {
    setRevealed(true)
    onReveal?.()
  }

  const handleDismiss = async () => {
    setDismissFailed(false)
    const ok = await onDismiss()
    if (!ok) setDismissFailed(true)
  }

  const handleSuggestion = (result) => {
    if (result.action !== 'removed') {
      setSource('user')
      if (result.content) setContent(result.content)
    }
    onSuggestionDone?.(result)
  }

  return (
    <div className="mb-6">
      <div className="bg-surface border border-[var(--color-border)] rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Lock size={14} color="var(--color-ink-3)" />
          <p className="text-[13px] text-ink-2">{heading}</p>
        </div>

        {!revealed ? (
          <button
            onClick={reveal}
            className="w-full text-center text-[14px] text-accent font-medium py-4 rounded-lg bg-surface-2 hover:bg-accent-light transition-colors"
          >
            Antippen zum Anzeigen
          </button>
        ) : (
          <>
            <p className="font-display text-[18px] text-ink leading-[1.4]">„{content}“</p>
            {source === 'auto' && <SuggestionActions insight={{ ...insight, content }} onDone={handleSuggestion} />}
            {/* U5a: Deine Einschätzung · Daran weiterarbeiten */}
            <InsightRating
              insight={{ ...insight, content, source, user_rating: rating }}
              continueLabel={continueLabel}
              onUpdated={(f) => {
                if ('user_rating' in f) setRating(f.user_rating)
                if (f.content) { setContent(f.content); setSource('user') }
              }}
              onRemoved={() => onSuggestionDone?.({ action: 'removed' })}
            />
          </>
        )}

        {onDismiss && (
          <div className="flex justify-end mt-4">
            <button onClick={handleDismiss} className="text-[13px] text-ink-3 hover:text-ink-2">Heute nicht</button>
          </div>
        )}
        {dismissFailed && <p role="alert" className="text-[12px] text-ink-2 mt-2">Das hat gerade nicht geklappt. Versuch es bitte noch einmal.</p>}
      </div>
      <p className="text-[12px] text-ink-3 mt-2 px-1">
        Verdeckt, damit niemand mitliest, der gerade auf dein Handy schaut.
      </p>
    </div>
  )
}
