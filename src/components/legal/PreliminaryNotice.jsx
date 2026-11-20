// Kennzeichnung „Vorläufige Fassung“ (Paket K): sichtbar, solange LEGAL_TEXTS_STATUS nicht 'freigegeben' ist.
import { PRELIMINARY_NOTICE, SHOW_PRELIMINARY_NOTICE } from '../../content/legalTexts'

export function PreliminaryNotice({ className = '' }) {
  if (!SHOW_PRELIMINARY_NOTICE) return null
  return (
    <p role="note" className={`text-[12px] text-ink-2 bg-surface-2 border border-[var(--color-border)] rounded-lg px-3 py-2 leading-relaxed ${className}`}>
      {PRELIMINARY_NOTICE}
    </p>
  )
}
