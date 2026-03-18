import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Home, MessageCircle, Sparkles, User } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export function BottomNav() {
  const { user } = useAuth()
  const [newInsights, setNewInsights] = useState(0)

  useEffect(() => {
    if (!user) return
    // Ungesehene Erkenntnisse zählen (source: auto, noch nicht pinned = frisch)
    supabase
      .from('insights')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('source', 'auto')
      .eq('is_pinned', false)
      .gte('created_at', new Date(Date.now() - 86400000 * 7).toISOString()) // letzte 7 Tage
      .then(({ count }) => setNewInsights(count || 0))
  }, [user])

  const NAV_ITEMS = [
    { to: '/home', icon: Home, label: 'Home' },
    { to: '/coach', icon: MessageCircle, label: 'Coach' },
    { to: '/mirror', icon: Sparkles, label: 'Spiegel', badge: newInsights },
    { to: '/profile', icon: User, label: 'Profil' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-[var(--color-border)] z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                isActive ? 'text-accent' : 'text-ink-3'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <Icon size={22} strokeWidth={isActive ? 2 : 1.5} />
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-coral text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
