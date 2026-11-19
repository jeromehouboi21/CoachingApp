// Baustein „Warum sich die App etwas merkt“ (Paket K, W2; Konzept 3.2/3.3).
// Heute in „Wie es funktioniert“, in W3 als Screen 2 des Einstiegs.
// showSecurityLink: Link „Wie wir deine Daten schützen ›“ → /sicherheit
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { WHY_MEMORY, WHAT_IS_STORED } from '../content/whyMemory'

function StoredSheet({ onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Was genau gespeichert wird">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-surface w-full max-w-lg rounded-t-2xl max-h-[85vh] overflow-y-auto p-6 pb-10">
        <button onClick={onClose} aria-label="Schließen" className="absolute right-4 top-4 p-1 text-ink-3 hover:text-ink-2">
          <X size={18} />
        </button>
        <h3 className="font-display text-[22px] text-ink mb-4">Was genau gespeichert wird</h3>
        <ul className="flex flex-col gap-4">
          {WHAT_IS_STORED.map(row => (
            <li key={row.what} className="border-b border-[var(--color-border)] pb-3 last:border-0">
              <p className="text-[14px] font-medium text-ink">{row.what}</p>
              <p className="text-[13px] text-ink-2 mt-0.5">Wofür: {row.why}</p>
              <p className="text-[13px] text-ink-3 mt-0.5">Wo du es siehst: {row.where}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  )
}

export function WhyMemoryBlock({ showSecurityLink = true }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  return (
    <div>
      <h2 className="font-display text-[22px] text-ink leading-[1.3] mb-3">
        {WHY_MEMORY.titleStart} <em>{WHY_MEMORY.titleEmphasis}</em>
      </h2>
      {WHY_MEMORY.intro.map((p, i) => (
        <p key={i} className="text-[14px] text-ink-2 leading-[1.7] mb-3">{p}</p>
      ))}
      <ul className="flex flex-col gap-3 my-4">
        {WHY_MEMORY.points.map(pt => (
          <li key={pt.title} className="flex gap-3">
            <span className="w-5 text-center text-accent flex-none" aria-hidden="true">{pt.symbol}</span>
            <span>
              <span className="block text-[14px] font-medium text-ink">{pt.title}</span>
              <span className="block text-[13px] text-ink-2">{pt.text}</span>
            </span>
          </li>
        ))}
      </ul>
      {WHY_MEMORY.closing.map((p, i) => (
        <p key={i} className="text-[14px] text-ink-2 leading-[1.7] mb-2">{p}</p>
      ))}
      <div className="flex flex-col items-start gap-1 mt-3">
        <button onClick={() => setOpen(true)} className="text-[13px] text-accent hover:underline">Was genau gespeichert wird ›</button>
        {showSecurityLink && (
          <button onClick={() => navigate('/sicherheit')} className="text-[13px] text-accent hover:underline">Wie wir deine Daten schützen ›</button>
        )}
      </div>
      {open && <StoredSheet onClose={() => setOpen(false)} />}
    </div>
  )
}
