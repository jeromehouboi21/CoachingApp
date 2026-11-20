// Punkteanzeige „Schritt x von 3“ für /start/1–3 (nicht auf Screen 4)
export function StartDots({ current }) {
  return (
    <div className="flex items-center justify-between mb-10">
      <span className="font-display text-[24px] text-ink">Friedensstifter</span>
      <div className="flex items-center gap-2" aria-label={`Schritt ${current} von 3`}>
        {[1, 2, 3].map(i => (
          <span key={i} className={`h-2 rounded-full transition-all ${i === current ? 'bg-accent w-4' : 'bg-ink-3 w-2'}`} />
        ))}
      </div>
    </div>
  )
}
