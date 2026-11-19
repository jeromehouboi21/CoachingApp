// Gemeinsame Bausteine der drei Spiegel-Ebenen (U2).
// Wertfrei (UX-Konzept 4.3c): eine Farbe, keine Punkte, beschreibende Texte statt Urteile.

export function LoadingDots() {
  return (
    <div className="flex justify-center py-16">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  )
}

/** Sichtbarer Ladefehler statt eines irreführenden Leerzustands (kein stilles Scheitern). */
export function LoadError({ onRetry }) {
  return (
    <div className="bg-surface border border-[var(--color-border)] rounded-xl p-5 text-center">
      <p className="text-[14px] text-ink-2 mb-3">Das hat gerade nicht geklappt.</p>
      {onRetry && (
        <button onClick={onRetry} className="text-[13px] text-accent font-medium hover:underline">
          Nochmal laden
        </button>
      )}
    </div>
  )
}

export function SectionLabel({ children }) {
  return <p className="text-[11px] uppercase tracking-[0.06em] font-medium text-ink-3 mb-3">{children}</p>
}

/** Beschreibender Status statt Wertung. `active` → kein Zusatz. */
export function statusText(status) {
  if (status === 'fading') return 'seltener in den letzten Gesprächen'
  if (status === 'resolved') return 'zeigt sich gerade kaum'
  return null
}

export function momentsText(n) {
  return n === 1 ? '1 Moment aus Gesprächen' : `${n} Momente aus Gesprächen`
}

export function formatDay(iso, withYear = false) {
  return new Date(iso).toLocaleDateString('de-DE', withYear
    ? { day: 'numeric', month: 'long', year: 'numeric' }
    : { day: 'numeric', month: 'long' })
}
