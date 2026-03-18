import { NavLink } from 'react-router-dom'
import { Home, MessageCircle, User } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/coach', icon: MessageCircle, label: 'Begleiter' },
  { to: '/profile', icon: User, label: 'Profil' },
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
              `flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-all ${
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
