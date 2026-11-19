import { NavLink } from 'react-router-dom'
import { Sun, MessageCircle, Sparkles } from 'lucide-react'

// Drei Tabs nach dem Kreislauf (U1): Heute · Gespräch · Spiegel. Das Profil liegt am Avatar
// oben rechts (ProfileButton). Bewusst ohne Zähler für Ungelesenes (CLAUDE.md, „Einladen statt drängen“).
const NAV_ITEMS = [
  { to: '/home', icon: Sun, label: 'Heute' },
  { to: '/coach', icon: MessageCircle, label: 'Gespräch' },
  { to: '/mirror', icon: Sparkles, label: 'Spiegel' },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-[var(--color-border)] z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all ${
                isActive ? 'text-accent' : 'text-ink-3'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2 : 1.5} />
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
