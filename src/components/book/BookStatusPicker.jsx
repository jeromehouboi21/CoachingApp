// T1 Buch-Seite (Handoff 4.5): „Kennst du das Buch schon?“ mit echten Radios.
// „Ja, durchgelesen“ / „Noch nicht“ speichern sofort. „Ich lese gerade“ speichert erst mit gewähltem Teil.
// Bei Fehler: Meldung, Auswahl springt auf den gespeicherten Stand zurück.
import { useEffect, useState } from 'react'
import { useBookStatus } from '../../hooks/useBookStatus'
import { BOOK_PAGE_TEXT as T, BOOK_UI_TEXT as U, BOOK_PARTS, BOOK_REFERENCES_LIVE } from '../../content/book'

const OPTIONS = [
  { value: 'read', label: T.statusRead },
  { value: 'reading', label: T.statusReading },
  { value: 'not_yet', label: T.statusNotYet },
]

function Radio({ name, value, checked, disabled, onChange, children }) {
  return (
    <label className={`flex items-center gap-3 min-h-[44px] px-4 py-2 border-b border-[var(--color-border)] last:border-0 ${disabled ? 'opacity-60' : 'cursor-pointer hover:bg-surface-2'}`}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="w-5 h-5 m-0 shrink-0 accent-[var(--color-accent)]"
      />
      <span className="text-[15px] text-ink">{children}</span>
    </label>
  )
}

export function BookStatusPicker() {
  const { status: savedStatus, progress: savedProgress, state, setState, save } = useBookStatus()
  const [status, setStatus] = useState(savedStatus)
  const [progress, setProgress] = useState(savedProgress)
  const saving = state === 'saving'

  // Gespeicherten Stand übernehmen, sobald er sich ändert (nach dem Speichern bzw. Neuladen des Profils)
  useEffect(() => {
    setStatus(savedStatus)
    setProgress(savedProgress)
  }, [savedStatus, savedProgress])

  // „Gespeichert“ nach 2,5 s ausblenden
  useEffect(() => {
    if (state !== 'saved') return
    const t = window.setTimeout(() => setState('idle'), 2500)
    return () => window.clearTimeout(t)
  }, [state, setState])

  const revert = () => { setStatus(savedStatus); setProgress(savedProgress) }

  const chooseStatus = async (value) => {
    setStatus(value)
    if (value === 'reading') {
      // Noch nichts speichern; ein gespeicherter Lesestand bleibt vorausgewählt
      setProgress(savedStatus === 'reading' ? savedProgress : null)
      if (state === 'error' || state === 'saved') setState('idle')
      return
    }
    setProgress(null)
    const ok = await save(value, null)
    if (!ok) revert()
  }

  const chooseProgress = async (n) => {
    setProgress(n)
    const ok = await save('reading', n)
    if (!ok) revert()
  }

  return (
    <section id="buch-status" tabIndex={-1} aria-labelledby="buch-status-title" className="outline-none scroll-mt-6">
      <h2 id="buch-status-title" className="text-[11px] text-accent uppercase tracking-[0.08em] font-medium mb-3">
        {T.statusQuestion}
      </h2>

      <div role="radiogroup" aria-labelledby="buch-status-title" className="bg-surface border border-[var(--color-border)] rounded-lg overflow-hidden">
        {OPTIONS.map(o => (
          <Radio
            key={o.value}
            name="book-status"
            value={o.value}
            checked={status === o.value}
            disabled={saving}
            onChange={() => chooseStatus(o.value)}
          >
            {o.label}
          </Radio>
        ))}
      </div>

      {status === 'reading' && (
        <div className="mt-4">
          <p id="buch-progress-title" className="text-[14px] text-ink font-medium mb-2">{U.progressQuestion}</p>
          <div role="radiogroup" aria-labelledby="buch-progress-title" className="bg-surface border border-[var(--color-border)] rounded-lg overflow-hidden">
            {BOOK_PARTS.map(p => (
              <Radio
                key={p.n}
                name="book-progress"
                value={String(p.n)}
                checked={progress === p.n}
                disabled={saving}
                onChange={() => chooseProgress(p.n)}
              >
                {U.partLabel.replace('{n}', String(p.n)).replace('{titel}', p.title)}
              </Radio>
            ))}
          </div>
          {progress == null && <p className="text-[13px] text-ink-2 mt-2">{U.progressHint}</p>}
        </div>
      )}

      {/* Rückmeldung: „Gespeichert“ höflich angesagt, Fehler als Alarm und bleibt stehen */}
      <div aria-live="polite" className="min-h-[24px] mt-3">
        {state === 'saved' && <p className="text-[13px] text-accent font-medium">{U.saved}</p>}
      </div>
      {state === 'error' && <p role="alert" className="text-[13px] text-coral -mt-1 mb-2">{U.error}</p>}

      <p className="text-[13px] text-ink-3 leading-relaxed">{U.changeNote}</p>
      {!BOOK_REFERENCES_LIVE && <p className="text-[13px] text-ink-3 leading-relaxed mt-2">{U.notLiveNote}</p>}
    </section>
  )
}
