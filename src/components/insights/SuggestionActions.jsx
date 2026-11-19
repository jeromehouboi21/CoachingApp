import { useState } from 'react'
import { confirmInsight, adaptInsight, removeInsight } from '../../lib/insightActions'

// „Stimmt das so?“ an automatisch entstandenen Erkenntnissen (source='auto'), U3.
// Ja → eigene Erkenntnis · Anpassen → eigener Wortlaut · Entfernen → gelöscht.
// onDone(result): { action: 'confirmed' | 'adapted', content } oder { action: 'removed' }.
export function SuggestionActions({ insight, question = 'Stimmt das so?', onDone }) {
  const [mode, setMode] = useState('ask')   // ask | edit
  const [text, setText] = useState(insight.content ?? '')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const run = async (fn, result) => {
    setBusy(true)
    setFailed(false)
    const { ok } = await fn()
    setBusy(false)
    if (ok) onDone?.(result)
    else setFailed(true)
  }

  if (mode === 'edit') {
    return (
      <div className="mt-3">
        <label className="text-[12px] text-ink-3 block mb-1" htmlFor={`adapt-${insight.id}`}>In deinen Worten</label>
        <textarea
          id={`adapt-${insight.id}`}
          value={text}
          onChange={e => setText(e.target.value)}
          rows={3}
          className="w-full bg-surface-2 rounded-lg px-3 py-2 text-[14px] text-ink outline-none border border-[var(--color-border)] focus:border-accent resize-none"
        />
        <div className="flex items-center gap-3 mt-2">
          <button
            disabled={busy || !text.trim()}
            onClick={() => run(() => adaptInsight(insight.id, text), { action: 'adapted', content: text.trim() })}
            className="bg-accent text-white text-[13px] font-medium px-4 py-1.5 rounded-full disabled:opacity-50"
          >
            Speichern
          </button>
          <button onClick={() => { setMode('ask'); setText(insight.content ?? '') }} className="text-[13px] text-ink-3">
            Abbrechen
          </button>
        </div>
        {failed && <p role="alert" className="text-[12px] text-ink-2 mt-2">Das hat gerade nicht geklappt. Versuch es bitte noch einmal.</p>}
      </div>
    )
  }

  return (
    <div className="mt-3">
      <p className="text-[12px] text-ink-3 mb-2">{question}</p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          disabled={busy}
          onClick={() => run(() => confirmInsight(insight.id), { action: 'confirmed', content: insight.content })}
          className="text-[13px] font-medium px-3 py-1 rounded-full border border-[var(--color-border)] text-ink hover:bg-accent-light disabled:opacity-50"
        >
          Ja
        </button>
        <button
          disabled={busy}
          onClick={() => setMode('edit')}
          className="text-[13px] font-medium px-3 py-1 rounded-full border border-[var(--color-border)] text-ink hover:bg-accent-light disabled:opacity-50"
        >
          Anpassen
        </button>
        <button
          disabled={busy}
          onClick={() => run(() => removeInsight(insight.id), { action: 'removed' })}
          className="text-[13px] px-3 py-1 rounded-full text-ink-3 hover:text-ink-2 disabled:opacity-50"
        >
          Entfernen
        </button>
      </div>
      {failed && <p role="alert" className="text-[12px] text-ink-2 mt-2">Das hat gerade nicht geklappt. Versuch es bitte noch einmal.</p>}
    </div>
  )
}
