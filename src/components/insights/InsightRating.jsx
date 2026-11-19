// „Deine Einschätzung“ und „Daran weiterarbeiten“ an einer Erkenntnis (UX-Konzept 4.3d, 4.2d, U5a).
// Die App bewertet nichts – nur der Mensch selbst, freiwillig, jederzeit änderbar oder zurücknehmbar.
// Writes über insightActions (bestätigt mit .select('id')); Erfolg erst nach bestätigtem Write.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { rateInsight, adaptInsight, removeInsight } from '../../lib/insightActions'

export const RATING_OPTIONS = [
  { value: 'helpful', symbol: '✦', label: 'Hat mich weitergebracht' },
  { value: 'unclear', symbol: '?', label: 'Verstehe ich nicht' },
  { value: 'disagree', symbol: '≠', label: 'Teile ich nicht' },
]

const ERROR_TEXT = 'Das hat gerade nicht geklappt. Versuch es bitte noch einmal.'

/** Weiterarbeiten nur mit Ursprungsgespräch (E-U5a-2) und nicht bei „Teile ich nicht“. */
export function canContinueInsight(insight) {
  return !!insight?.conversation_id && insight.user_rating !== 'disagree'
}

/** Navigation ins Ursprungsgespräch mit Weiterarbeiten-Einstieg (CoachScreen liest den State). */
export function useContinueInsight() {
  const navigate = useNavigate()
  return (insight) => navigate('/coach', {
    state: { continueInsight: { insightId: insight.id, conversationId: insight.conversation_id, content: insight.content } },
  })
}

function Sheet({ children, onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Deine Einschätzung">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-surface w-full max-w-lg rounded-t-2xl max-h-[85vh] overflow-y-auto p-6 pb-10">
        {children}
      </div>
    </div>,
    document.body,
  )
}

/**
 * Bedienleiste unter einer Erkenntnis.
 * onUpdated(fields): Felder, die sich geändert haben (user_rating, rated_at, content, source)
 * onRemoved(): Erkenntnis gelöscht
 * continueLabel: Text des Weiterarbeiten-Links (Heute: „Wie war es seitdem? Daran weiterarbeiten →“)
 */
export function InsightRating({ insight, onUpdated, onRemoved, continueLabel = 'Daran weiterarbeiten →', showContinue = true }) {
  const continueInsight = useContinueInsight()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('choose')   // choose | edit
  const [text, setText] = useState(insight.content ?? '')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const rating = insight.user_rating ?? null

  const run = async (fn, onOk) => {
    setBusy(true)
    setFailed(false)
    const { ok } = await fn()
    setBusy(false)
    if (!ok) { setFailed(true); return false }
    onOk()
    return true
  }

  const choose = (value) => {
    const next = rating === value ? null : value   // erneutes Tippen nimmt zurück
    run(() => rateInsight(insight.id, next), () => {
      onUpdated?.({ user_rating: next, rated_at: next ? new Date().toISOString() : null })
      setOpen(false)
    })
  }

  const saveText = () => run(() => adaptInsight(insight.id, text), () => {
    onUpdated?.({ content: text.trim(), source: 'user' })
    setOpen(false)
    setMode('choose')
  })

  const remove = () => run(() => removeInsight(insight.id), () => { setOpen(false); onRemoved?.() })

  const openSheet = (startMode = 'choose') => {
    setText(insight.content ?? '')
    setFailed(false)
    setMode(startMode)
    setOpen(true)
  }

  const continueText = rating === 'unclear' ? 'Magst du es im Gespräch klären? →' : continueLabel

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
        <button onClick={() => openSheet()} className="text-[13px] text-ink-2 hover:text-ink">
          Deine Einschätzung ›
        </button>
        {showContinue && canContinueInsight(insight) && (
          <button onClick={() => continueInsight(insight)} className="text-[13px] text-accent font-medium hover:underline">
            {continueText}
          </button>
        )}
      </div>

      {/* „Teile ich nicht“: in eigenen Worten formulieren oder entfernen (E-U5a-4) */}
      {rating === 'disagree' && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
          <button onClick={() => openSheet('edit')} className="text-[13px] text-accent hover:underline">
            In deinen Worten formulieren
          </button>
          <button onClick={remove} disabled={busy} className="text-[13px] text-ink-3 hover:text-ink-2 disabled:opacity-50">
            Entfernen
          </button>
        </div>
      )}
      {failed && !open && <p role="alert" className="text-[12px] text-ink-2 mt-2">{ERROR_TEXT}</p>}

      {open && (
        <Sheet onClose={() => setOpen(false)}>
          <h3 className="font-display text-[22px] text-ink mb-2">Deine Einschätzung</h3>
          <p className="text-[14px] text-ink-2 leading-relaxed mb-4">„{insight.content}“</p>

          {mode === 'edit' ? (
            <>
              <label htmlFor={`rate-edit-${insight.id}`} className="text-[12px] text-ink-3 block mb-1">In deinen Worten</label>
              <textarea
                id={`rate-edit-${insight.id}`}
                value={text}
                onChange={e => setText(e.target.value)}
                rows={3}
                className="w-full bg-surface-2 rounded-lg px-3 py-2 text-[15px] text-ink outline-none border border-[var(--color-border)] focus:border-accent resize-none mb-3"
              />
              {failed && <p role="alert" className="text-[13px] text-ink-2 mb-3">{ERROR_TEXT}</p>}
              <div className="flex items-center gap-3">
                <button
                  onClick={saveText}
                  disabled={busy || !text.trim()}
                  className="bg-accent text-white text-[14px] font-medium px-5 py-2 rounded-full disabled:opacity-50"
                >
                  Speichern
                </button>
                <button onClick={() => setMode('choose')} className="text-[13px] text-ink-3">Zurück</button>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2 mb-4">
                {RATING_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    onClick={() => choose(o.value)}
                    disabled={busy}
                    aria-pressed={rating === o.value}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors disabled:opacity-60 ${
                      rating === o.value ? 'border-accent bg-accent-light text-ink' : 'border-[var(--color-border)] text-ink-2 hover:bg-surface-2'
                    }`}
                  >
                    <span className="w-5 text-center text-[15px]">{o.symbol}</span>
                    <span className="text-[15px]">{o.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <button onClick={() => setMode('edit')} disabled={busy} className="text-[14px] text-ink-2 hover:text-ink">✎ Anpassen</button>
                <button onClick={remove} disabled={busy} className="text-[14px] text-ink-3 hover:text-ink-2">✕ Entfernen</button>
                {rating && (
                  <button onClick={() => choose(rating)} disabled={busy} className="text-[14px] text-ink-3 hover:text-ink-2">
                    Einschätzung zurücknehmen
                  </button>
                )}
              </div>
              {failed && <p role="alert" className="text-[13px] text-ink-2 mt-3">{ERROR_TEXT}</p>}
              <p className="text-[12px] text-ink-3 mt-5 leading-relaxed">
                Deine Einschätzung kannst du jederzeit ändern oder zurücknehmen.
              </p>
            </>
          )}
        </Sheet>
      )}
    </>
  )
}
