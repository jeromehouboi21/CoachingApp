import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Avatar } from '../../components/ui/Avatar'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { getDailyImpulse } from '../../lib/prompts'
import { Compass, Scale, Flame, BookOpen } from 'lucide-react'

const TOOL_CARDS = [
  {
    id: 'coach',
    icon: Compass,
    iconBg: 'bg-accent-light',
    iconColor: 'var(--color-accent)',
    title: 'KI-Coach',
    desc: 'Gespräch starten',
    to: '/coach',
    badge: null,
  },
  {
    id: 'scale',
    icon: Scale,
    iconBg: 'bg-coral-light',
    iconColor: 'var(--color-coral)',
    title: 'Wie geht\'s dir?',
    desc: 'Auf einer Skala 1–10',
    to: '/coach',
    badge: null,
  },
  {
    id: 'voices',
    icon: Flame,
    iconBg: 'bg-premium-light',
    iconColor: 'var(--color-premium)',
    title: 'Innere Stimmen',
    desc: 'Welche Stimme bremst dich?',
    to: null,
    badge: 'PRO',
  },
  {
    id: 'learn',
    icon: BookOpen,
    iconBg: 'bg-surface-2',
    iconColor: 'var(--color-ink-2)',
    title: 'Verstehen',
    desc: 'Wie Muster entstehen',
    to: null,
    badge: null,
    soon: true,
  },
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Guten Morgen'
  if (h < 18) return 'Guten Tag'
  return 'Guten Abend'
}

export function HomeScreen() {
  const { profile, user } = useAuth()
  const navigate = useNavigate()
  const impulse = getDailyImpulse()
  const name = profile?.display_name || user?.email?.split('@')[0] || 'Du'
  const streak = profile?.streak_count || 0

  return (
    <div className="px-5 pt-12 pb-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-[13px] text-ink-3 mb-1">{getGreeting()}</p>
          <h1 className="font-display text-[26px] text-ink leading-[1.2]">
            Was bewegt <em>heute?</em>
          </h1>
        </div>
        <button onClick={() => navigate('/profile')}>
          <Avatar name={name} size="md" />
        </button>
      </div>

      {/* Tagesimpuls Card */}
      <div
        className="relative bg-accent rounded-xl p-6 mb-8 overflow-hidden cursor-pointer"
        onClick={() => navigate('/coach')}
      >
        <div className="absolute right-0 top-0 w-32 h-32 rounded-full bg-white opacity-5 translate-x-10 -translate-y-10" />
        <div className="absolute right-4 bottom-0 w-20 h-20 rounded-full bg-white opacity-5 translate-y-8" />
        <p className="text-[11px] text-white/70 uppercase tracking-[0.08em] mb-3 relative z-10">✦ Tagesimpuls</p>
        <p className="font-display text-[20px] text-white leading-[1.35] mb-5 relative z-10">{impulse}</p>
        <button
          className="bg-white text-accent text-[13px] font-medium px-4 py-2 rounded-full hover:bg-accent-light transition-colors relative z-10"
          onClick={e => { e.stopPropagation(); navigate('/coach') }}
        >
          Darüber sprechen →
        </button>
      </div>

      {/* Werkzeugkasten */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[17px] font-medium text-ink">Dein Werkzeugkasten</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {TOOL_CARDS.map(tool => (
            <div
              key={tool.id}
              className={`bg-surface border border-[var(--color-border)] rounded-xl p-4 shadow-sm relative ${tool.to && !tool.soon ? 'cursor-pointer hover:shadow' : 'opacity-70'} transition-all`}
              onClick={() => tool.to && !tool.soon && navigate(tool.to)}
            >
              {tool.badge && (
                <span className="absolute top-3 right-3 bg-premium-light text-premium text-[10px] font-medium px-2 py-0.5 rounded-full">
                  {tool.badge}
                </span>
              )}
              {tool.soon && (
                <span className="absolute top-3 right-3 bg-surface-2 text-ink-3 text-[10px] font-medium px-2 py-0.5 rounded-full">
                  Bald
                </span>
              )}
              <div className={`w-10 h-10 ${tool.iconBg} rounded-lg flex items-center justify-center mb-3`}>
                <tool.icon size={18} color={tool.iconColor} />
              </div>
              <p className="text-[14px] font-medium text-ink mb-0.5">{tool.title}</p>
              <p className="text-[12px] text-ink-3">{tool.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Streak Bar */}
      <div className="bg-surface border border-[var(--color-border)] rounded-lg px-4 py-3 flex items-center gap-3">
        <span className="text-2xl">🔥</span>
        <div className="flex-1">
          <p className="text-[13px] text-ink-3">Deine Reflexionsstähne</p>
          <p className="text-[18px] font-medium text-ink">{streak} {streak === 1 ? 'Tag' : 'Tage'}</p>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full ${i < streak % 7 ? 'bg-accent' : 'bg-surface-2'}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
