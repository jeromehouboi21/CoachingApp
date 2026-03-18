import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '../ui/Button'

export function ConversationEndModal({ suggestion, onConfirm, onSkip }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(suggestion?.content || '')

  const handleConfirm = () => {
    onConfirm({ content: text, category: suggestion?.category || 'erkenntnis' })
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
      <div className="bg-surface rounded-t-2xl w-full max-w-lg p-6 animate-[fadeSlideUp_0.3s_ease]">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-display text-[22px] text-ink">Was nimmst du heute mit?</h3>
            <p className="text-[13px] text-ink-2 mt-1">
              Der Coach hat etwas für dich notiert — stimmt es so?
            </p>
          </div>
          <button onClick={onSkip} className="p-1 text-ink-3 hover:text-ink-2 mt-1">
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
            <p className="text-[15px] text-ink leading-[1.6] italic">„{text}"</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Button variant="primary" className="w-full" onClick={handleConfirm}>
            Ja, stimmt so
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => setEditing(!editing)}>
            {editing ? 'Vorschau' : 'Anpassen'}
          </Button>
          <button onClick={onSkip} className="text-[13px] text-ink-3 text-center py-2">
            Überspringen
          </button>
        </div>
      </div>
    </div>
  )
}
