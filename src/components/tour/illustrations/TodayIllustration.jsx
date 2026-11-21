// Schritt 2: Mini-Heute mit Tagesimpuls und verdeckter Karte (Design-Canvas „Heute“)
import { Sparkles, Lock } from 'lucide-react'
import { MiniTabBar, ExampleAvatar } from './MiniTabBar'
import { TOUR_EXAMPLES as EX } from '../../../content/welcomeTour'

export function TodayIllustration() {
  return (
    <>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[11px] text-ink-2">{EX.todayGreeting}</p>
          <p className="mt-0.5 font-display text-[20px] text-ink">Was bewegt <em className="text-accent">heute?</em></p>
        </div>
        <ExampleAvatar />
      </div>
      <div className="mt-3 bg-surface border border-[var(--color-border)] rounded-[14px] px-3.5 py-3 flex flex-col gap-1.5">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-accent">
          <Sparkles size={13} strokeWidth={1.8} />{EX.todayImpulseLabel}
        </span>
        <span className="text-[13px] leading-[1.4] text-ink">{EX.todayImpulse}</span>
      </div>
      <div className="mt-2 bg-surface border border-[var(--color-border)] rounded-[14px] px-3.5 py-2.5 flex items-center gap-2">
        <Lock size={14} strokeWidth={1.8} color="var(--color-ink-2)" />
        <span className="text-[12px] text-ink-2">{EX.todayHidden}</span>
      </div>
      <div className="flex-1" />
      <MiniTabBar active="Heute" />
    </>
  )
}
