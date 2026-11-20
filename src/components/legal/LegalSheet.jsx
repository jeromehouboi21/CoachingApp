// Ruhiges Vollbild-Sheet für Rechtstexte im Einstieg (Paket K W3)
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export function LegalSheet({ title, onClose, children }) {
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-bg w-full max-w-lg rounded-t-2xl max-h-[90vh] overflow-y-auto p-6 pb-10">
        <button onClick={onClose} aria-label="Schließen" className="absolute right-4 top-4 p-1 text-ink-3 hover:text-ink-2">
          <X size={18} />
        </button>
        <h3 className="font-display text-[22px] text-ink mb-4 pr-8">{title}</h3>
        {children}
      </div>
    </div>,
    document.body,
  )
}
