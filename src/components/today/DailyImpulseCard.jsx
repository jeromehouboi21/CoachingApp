// Tagesimpuls auf Heute (U3): als Hauptkarte (Zustand C) oder als Nebenkarte (Zustand B).
export function DailyImpulseCard({ impulse, onTalk, compact = false }) {
  if (compact) {
    return (
      <button
        onClick={onTalk}
        className="w-full text-left bg-surface border border-[var(--color-border)] rounded-xl p-4 mb-6 hover:shadow transition-all"
      >
        <p className="text-[11px] text-ink-3 uppercase tracking-[0.06em] mb-1">✦ Tagesimpuls</p>
        <p className="text-[14px] text-ink leading-[1.45]">{impulse}</p>
      </button>
    )
  }

  return (
    <div className="relative bg-accent rounded-xl p-6 mb-6 overflow-hidden">
      <div className="absolute right-0 top-0 w-32 h-32 rounded-full bg-white opacity-5 translate-x-10 -translate-y-10" />
      <div className="absolute right-4 bottom-0 w-20 h-20 rounded-full bg-white opacity-5 translate-y-8" />
      <p className="text-[11px] text-white/70 uppercase tracking-[0.08em] mb-3 relative z-10">✦ Tagesimpuls</p>
      <p className="font-display text-[20px] text-white leading-[1.35] mb-5 relative z-10">{impulse}</p>
      <button
        className="bg-white text-accent text-[13px] font-medium px-4 py-2 rounded-full hover:bg-accent-light transition-colors relative z-10"
        onClick={onTalk}
      >
        Darüber reden
      </button>
    </div>
  )
}
