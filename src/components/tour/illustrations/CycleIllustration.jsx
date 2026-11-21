// Schritt 5: 2×2-Raster Ankommen → Sprechen ↓ Erkennen ← Ausprobieren ↑ (Design-Canvas „Kreislauf“)
import { Activity, MessageCircle, Sparkles, Repeat, ArrowRight } from 'lucide-react'
import { TOUR_EXAMPLES as EX } from '../../../content/welcomeTour'

const [ANKOMMEN, SPRECHEN, ERKENNEN, AUSPROBIEREN] = EX.cycle

function Pill({ icon: Icon, label }) {
  return (
    <div className="flex items-center justify-center gap-[7px] h-11 rounded-full bg-surface shadow-[0_1px_4px_rgba(26,25,22,0.08)] text-[13px] font-medium text-ink">
      <Icon size={16} strokeWidth={1.8} color="var(--color-accent)" />{label}
    </div>
  )
}

function Arrow({ rotate }) {
  return (
    <div className="flex items-center justify-center">
      <ArrowRight size={18} strokeWidth={1.8} color="var(--color-accent)" style={{ transform: `rotate(${rotate}deg)` }} />
    </div>
  )
}

export function CycleIllustration({ caption }) {
  return (
    <>
      {/* Reihenfolge im Raster: oben Ankommen → Sprechen, rechts ↓, unten Ausprobieren ← Erkennen, links ↑ */}
      <div className="flex-1 grid grid-cols-[minmax(0,1fr)_36px_minmax(0,1fr)] grid-rows-[44px_1fr_44px] gap-1.5 content-center py-[22px] px-1">
        <Pill icon={Activity} label={ANKOMMEN} />
        <Arrow rotate={0} />
        <Pill icon={MessageCircle} label={SPRECHEN} />
        <Arrow rotate={-90} />
        <div />
        <Arrow rotate={90} />
        <Pill icon={Repeat} label={AUSPROBIEREN} />
        <Arrow rotate={180} />
        <Pill icon={Sparkles} label={ERKENNEN} />
      </div>
      <p className="text-center text-[13px] text-ink-2">{caption}</p>
    </>
  )
}
