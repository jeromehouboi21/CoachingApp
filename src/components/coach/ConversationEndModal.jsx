import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '../ui/Button'

// Abschluss eines Gesprächs (UX-Konzept 4.2c, U3).
// Schritt 1: „Was nimmst du heute mit?“ – bestätigen oder anpassen (wird als eigene Erkenntnis gespeichert).
// Schritt 2 (optional): „Magst du etwas ausprobieren?“ – Freitext als Vorhaben (category 'ziel').
// onSave / onSavePlan liefern { ok }; ohne Erfolg bleibt das Fenster offen und zeigt einen Hinweis.
export function ConversationEndModal({ suggestion, onSave, onSavePlan, onClose }) {
  const [step, setStep] = useState('confirm')   // confirm | plan
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(suggestion?.content || '')
  const [plan, setPlan] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const handleConfirm = async () => {
    if (!text.trim()) return
    setBusy(true)
    setFailed(false)
    const { ok } = await onSave({ content: text.trim(), category: suggestion?.category || 'erkenntnis' })
    setBusy(false)
    if (ok) setStep('plan')
    else setFailed(true)
  }

  const handleFinish = async () => {
    if (!plan.trim()) { onClose(); return }
    setBusy(true)
    setFailed(false)
    const { ok } = await onSavePlan(plan.trim())
    setBusy(false)
    if (ok) onClose()
    else setFailed(true)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
      <div className="bg-surface rounded-t-2xl w-full max-w-lg p-6 animate-[fadeSlideUp_0.3s_ease]">
        {step === 'confirm' ? (
          <>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-display text-[22px] text-ink">Was nimmst du heute mit?</h3>
                <p className="text-[13px] text-ink-2 mt-1">
                  Das ist aus dem Gespräch entstanden – stimmt es so?
                </p>
              </div>
              <button onClick={onClose} aria-label="Schließen" className="p-1 text-ink-3 hover:text-ink-2 mt-1">
                <X size={18} />
              </button>
            </div>

            {editing ? (
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                rows={3}
                className="w-full bg-surface-2 rounded-lg px-4 py-3 text-[15px] text-ink outline-none border border-[var(--color-border)] focus:border-accent resize-none mb-4"
              />
            ) : (
              <div className="bg-accent-light rounded-lg p-4 mb-4">
                <p className="text-[15px] text-ink leading-[1.6] italic">„{text}“</p>
              </div>
            )}

            {failed && (
              <p role="alert" className="text-[13px] text-ink-2 bg-surface-2 rounded-lg px-4 py-3 mb-3">
                Das ließ sich gerade nicht speichern. Versuch es bitte noch einmal.
              </p>
            )}

            <div className="flex flex-col gap-2">
              <Button variant="primary" className="w-full" onClick={handleConfirm} disabled={busy || !text.trim()}>
                Ja, stimmt so
              </Button>
              <Button variant="secondary" className="w-full" onClick={() => setEditing(!editing)} disabled={busy}>
                {editing ? 'Vorschau' : 'Anpassen'}
              </Button>
              <button onClick={onClose} className="text-[13px] text-ink-3 text-center py-2">
                Überspringen
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="font-display text-[22px] text-ink mb-1">Liegt jetzt in deinem Spiegel.</h3>
            <p className="text-[14px] text-ink-2 mb-4">Magst du etwas ausprobieren?</p>
            <textarea
              value={plan}
              onChange={e => setPlan(e.target.value)}
              rows={3}
              placeholder="Zum Beispiel: Im nächsten Meeting einmal nachfragen, bevor ich zusage."
              aria-label="Vorhaben, freiwillig"
              className="w-full bg-surface-2 rounded-lg px-4 py-3 text-[15px] text-ink outline-none border border-[var(--color-border)] focus:border-accent resize-none mb-4"
            />
            {failed && (
              <p role="alert" className="text-[13px] text-ink-2 bg-surface-2 rounded-lg px-4 py-3 mb-3">
                Das ließ sich gerade nicht speichern. Versuch es bitte noch einmal.
              </p>
            )}
            <div className="flex items-center justify-between">
              <Button variant="primary" onClick={handleFinish} disabled={busy}>Fertig</Button>
              <button onClick={onClose} className="text-[13px] text-ink-3 py-2 px-2">Überspringen</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
