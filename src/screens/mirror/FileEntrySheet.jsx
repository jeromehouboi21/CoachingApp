import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { statusText, momentsText, formatDay } from './shared'

// Detail eines Akte-Musters (coach_file_entries) als Sheet (U2, E-U2-2).
// Per createPortal in document.body, damit transform-tragende Vorfahren die fixed-Position nicht verschieben.
export function FileEntrySheet({ entry, voiceName, onClose }) {
  if (!entry) return null
  const history = entry.history ?? []
  const status = statusText(entry.status)

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true" aria-label={entry.label}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-surface w-full max-w-lg mx-auto rounded-t-2xl max-h-[75vh] overflow-y-auto p-6 pb-10">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h3 className="font-display text-[20px] text-ink leading-[1.25]">{entry.label}</h3>
            <p className="text-[12px] text-ink-3 mt-1">
              {momentsText(Math.max(1, history.length))}
              {status ? ` · ${status}` : ''}
            </p>
          </div>
          <button onClick={onClose} aria-label="Schließen" className="text-ink-3 p-1 flex-none">
            <X size={20} />
          </button>
        </div>

        {voiceName && <p className="text-[13px] text-ink-2 mb-3">gehört zu: {voiceName}</p>}
        {entry.description && <p className="text-[14px] text-ink-2 leading-relaxed mb-3">{entry.description}</p>}
        {entry.example && (
          <p className="text-[13px] italic text-ink-3 border-l-2 border-accent pl-3 mb-5 leading-relaxed">{entry.example}</p>
        )}

        <p className="text-[11px] uppercase tracking-[0.06em] font-medium text-ink-3 mb-3">Verlauf</p>
        {history.length ? (
          <div className="flex flex-col gap-4">
            {history.map((h, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-accent flex-none mt-1" />
                  {i < history.length - 1 && <div className="w-px flex-1 bg-[var(--color-border)] mt-1" />}
                </div>
                <div className="pb-3 flex-1">
                  {h.date && <p className="text-[11px] text-ink-3 mb-1">{formatDay(h.date, true)}</p>}
                  <p className="text-[13px] text-ink-2 leading-relaxed">{h.note}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-ink-3">Zum ersten Mal bemerkt am {formatDay(entry.first_detected, true)}.</p>
        )}
      </div>
    </div>,
    document.body
  )
}
