import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { ChevronRight, LogOut, Shield, CreditCard, User, HelpCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export function ProfileScreen() {
  const { profile, user, signOut } = useAuth()
  const navigate = useNavigate()
  const [insightCount, setInsightCount] = useState(0)

  useEffect(() => {
    if (!user) return
    supabase
      .from('insights')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .then(({ count }) => setInsightCount(count || 0))
  }, [user])
  const name = profile?.display_name || user?.email?.split('@')[0] || 'Unbekannt'

  const handleSignOut = async () => {
    await signOut()
    navigate('/onboarding')
  }

  return (
    <div className="px-5 pt-12 pb-6">
      {/* Profile Header */}
      <div className="flex flex-col items-center text-center mb-8">
        <Avatar name={name} size="lg" className="mb-4" />
        <h1 className="font-display text-[22px] text-ink mb-2">{name}</h1>
        <Badge variant={profile?.plan === 'premium' ? 'premium' : 'free'}>
          {profile?.plan === 'premium' ? 'Premium' : 'Kostenlos'}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-surface border border-[var(--color-border)] rounded-lg p-4 text-center">
          <p className="text-[24px] font-display text-ink">{profile?.streak_count || 0}</p>
          <p className="text-[12px] text-ink-3">Tage Streak</p>
        </div>
        <div className="bg-surface border border-[var(--color-border)] rounded-lg p-4 text-center">
          <p className="text-[24px] font-display text-ink">{profile?.sessions_used_this_month || 0}</p>
          <p className="text-[12px] text-ink-3">Gespräche</p>
        </div>
        <div className="bg-surface border border-[var(--color-border)] rounded-lg p-4 text-center">
          <p className="text-[24px] font-display text-ink">{insightCount}</p>
          <p className="text-[12px] text-ink-3">Erkenntnisse</p>
        </div>
      </div>

      {/* Jerome's CTA Card */}
      <div className="bg-accent rounded-xl p-5 mb-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-24 h-24 bg-white/5 rounded-full translate-x-6 -translate-y-6" />
        <p className="text-[11px] text-white/70 uppercase tracking-[0.08em] mb-2">Echtes Coaching</p>
        <h2 className="font-display text-[20px] text-white leading-[1.3] mb-2">Bereit für den nächsten Schritt?</h2>
        <p className="text-[13px] text-white/80 mb-4">Arbeite persönlich mit Jerome — zertifizierter systemischer Coach · Paracelsus · 160 Unterrichtsstunden.</p>
        <a
          href="https://www.friedensstifter.coach/contact/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-white text-accent text-[13px] font-medium px-4 py-2 rounded-full hover:bg-accent-light transition-colors"
        >
          Termin buchen →
        </a>
      </div>

      {/* Settings */}
      <div className="bg-surface border border-[var(--color-border)] rounded-lg overflow-hidden">
        {[
          { icon: User, label: 'Profil bearbeiten', action: null },
          { icon: HelpCircle, label: 'Wie es funktioniert', action: () => navigate('/howto') },
          { icon: CreditCard, label: 'Plan & Abonnement', action: null },
          { icon: Shield, label: 'Datenschutzerklärung', action: null },
        ].map(({ icon: Icon, label, action }) => (
          <button
            key={label}
            onClick={action}
            className="w-full flex items-center gap-3 px-4 py-4 border-b border-[var(--color-border)] last:border-0 hover:bg-surface-2 transition-colors text-left"
          >
            <Icon size={18} color="var(--color-ink-2)" />
            <span className="flex-1 text-[15px] text-ink">{label}</span>
            <ChevronRight size={16} color="var(--color-ink-3)" />
          </button>
        ))}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-4 hover:bg-surface-2 transition-colors text-left"
        >
          <LogOut size={18} color="var(--color-coral)" />
          <span className="flex-1 text-[15px] text-coral">Abmelden</span>
        </button>
      </div>

      <p className="text-[11px] text-ink-3 text-center mt-6">Alles, was du hier teilst, bleibt bei dir.</p>
    </div>
  )
}
