// Schritt 4: Segment-Umschalter und zwei Erkenntnis-Karten, eine mit ✦ (Design-Canvas „Spiegel“)
import { MiniTabBar } from './MiniTabBar'
import { TOUR_EXAMPLES as EX } from '../../../content/welcomeTour'

export function MirrorIllustration() {
  return (
    <>
      <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-white/55 border border-[var(--color-border)]">
        {EX.mirrorTabs.map((t, i) => (
          <span
            key={t}
            className={`text-center text-[11px] py-1.5 rounded-[9px] ${i === 0 ? 'bg-surface shadow-[0_1px_4px_rgba(26,25,22,0.08)] text-accent font-medium' : 'text-ink-2'}`}
          >
            {t}
          </span>
        ))}
      </div>
      <div className="mt-2.5 bg-surface border border-[var(--color-border)] rounded-[14px] px-3.5 py-3 flex flex-col gap-2">
        <div className="flex justify-between gap-2">
          <span className="font-display text-[16px] leading-[1.3] text-ink">{EX.mirrorInsight}</span>
          <span className="text-[16px] text-accent">✦</span>
        </div>
        <span className="text-[11px] text-ink-2">{EX.mirrorInsightMeta}</span>
        <div className="flex justify-between">
          <span className="text-[11px] text-accent font-medium">{EX.mirrorRating}</span>
          <span className="text-[11px] text-accent font-medium">{EX.mirrorContinue}</span>
        </div>
      </div>
      <div className="mt-2 bg-surface border border-[var(--color-border)] rounded-[14px] px-3.5 py-2.5">
        <span className="font-display text-[14px] text-ink">{EX.mirrorSecond}</span>
      </div>
      <div className="flex-1" />
      <MiniTabBar active="Spiegel" />
    </>
  )
}
