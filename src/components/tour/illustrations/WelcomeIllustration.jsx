// Schritt 1: Wortmarke und drei Knoten Heute · Gespräch · Spiegel (Design-Canvas „Main“)
import { Fragment } from 'react'
import { NAV_ITEMS } from '../../layout/BottomNav'
import { TOUR_EXAMPLES } from '../../../content/welcomeTour'

export function WelcomeIllustration({ caption }) {
  return (
    <div className="flex-1 flex flex-col justify-center items-center gap-7">
      <p className="font-display text-[22px] text-accent">{TOUR_EXAMPLES.wordmark}</p>
      <div className="w-full flex items-center px-1.5">
        {NAV_ITEMS.map(({ to, icon: Icon, label }, i) => (
          <Fragment key={to}>
            {i > 0 && <div className="flex-1 h-px -mt-[26px] bg-[rgba(45,90,78,0.35)]" />}
            <div className="flex flex-col items-center gap-2 w-[78px]">
              <div className="w-[58px] h-[58px] rounded-full bg-surface shadow-[0_2px_12px_rgba(26,25,22,0.08)] flex items-center justify-center">
                <Icon size={24} strokeWidth={1.8} color="var(--color-accent)" />
              </div>
              <span className="text-[13px] font-medium text-ink">{label}</span>
            </div>
          </Fragment>
        ))}
      </div>
      <p className="text-[13px] text-ink-2 text-center">{caption}</p>
    </div>
  )
}
