// Mini-Tab-Leiste für die Rundgang-Grafiken: dieselben Icons wie BottomNav (Wiedererkennung).
import { NAV_ITEMS } from '../../layout/BottomNav'

export function MiniTabBar({ active }) {
  return (
    <div className="flex gap-1.5 p-1.5 rounded-2xl bg-white/55 border border-[var(--color-border)]">
      {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
        const isActive = label === active
        return (
          <div
            key={to}
            className={`flex-1 flex flex-col items-center gap-[3px] py-[7px] rounded-xl ${isActive ? 'bg-surface shadow-[0_1px_4px_rgba(26,25,22,0.08)]' : ''}`}
          >
            <Icon size={18} strokeWidth={1.8} color={isActive ? 'var(--color-accent)' : 'var(--color-ink-2)'} />
            <span className={`text-[11px] ${isActive ? 'text-accent font-medium' : 'text-ink-2'}`}>{label}</span>
          </div>
        )
      })}
    </div>
  )
}

// Kleiner runder Avatar mit festen Beispiel-Initialen (keine echten Nutzerdaten)
export function ExampleAvatar({ size = 28 }) {
  return (
    <span
      className="rounded-full bg-accent text-white font-medium flex items-center justify-center shrink-0"
      style={{ width: size, height: size, fontSize: size > 30 ? 12 : 11 }}
    >
      JH
    </span>
  )
}
