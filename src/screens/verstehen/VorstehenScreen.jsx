import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { ChevronRight } from 'lucide-react'

const KNOWN_PATTERNS = [
  {
    key: 'rueckzug_unter_druck',
    label: 'Rückzug unter Druck',
    icon: '🪞',
    iconBg: 'bg-accent-light',
    desc: 'Wenn es eng wird, ziehst du dich zurück — statt anzusprechen, was dich stört.',
    category: 'Beziehungen',
  },
  {
    key: 'innerer_kritiker',
    label: 'Der innere Kritiker',
    icon: '🔍',
    iconBg: 'bg-surface-2',
    desc: 'Eine Stimme, die keine Fehler erlaubt — und deshalb vieles stoppt, bevor es beginnt.',
    category: 'Selbstbild',
  },
  {
    key: 'uebernahme_reflex',
    label: 'Übernahme-Reflex',
    icon: '⚡',
    iconBg: 'bg-premium-light',
    desc: 'Du übernimmst Verantwortung für andere — auch ohne Einladung dazu.',
    category: 'Arbeit',
  },
  {
    key: 'harmonie_um_jeden_preis',
    label: 'Harmonie um jeden Preis',
    icon: '🕊️',
    iconBg: 'bg-coral-light',
    desc: 'Konflikte zu vermeiden fühlt sich sicherer an — selbst wenn du dabei unsichtbar wirst.',
    category: 'Beziehungen',
  },
  {
    key: 'perfektionismus_blockade',
    label: 'Perfektionismus-Blockade',
    icon: '🎯',
    iconBg: 'bg-surface-2',
    desc: 'Solange etwas nicht perfekt ist, fühlt es sich nicht gut genug an, um es zu zeigen.',
    category: 'Arbeit',
  },
]

export function VorstehenScreen() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [personalPatterns, setPersonalPatterns] = useState([])
  const [filter, setFilter] = useState('Alle')

  useEffect(() => {
    if (!user) return
    supabase
      .from('pattern_references')
      .select('pattern_key, pattern_label, excerpt, detected_at')
      .eq('user_id', user.id)
      .order('detected_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          // Deduplizieren nach pattern_key — jedes Muster einmal
          const seen = new Set()
          setPersonalPatterns(data.filter(p => {
            if (seen.has(p.pattern_key)) return false
            seen.add(p.pattern_key)
            return true
          }))
        }
      })
  }, [user])

  const hasPersonalPatterns = personalPatterns.length > 0
  const isPremium = profile?.plan === 'premium'

  const FILTERS = ['Alle', 'Beziehungen', 'Arbeit', 'Selbstbild']

  const filteredPatterns = filter === 'Alle'
    ? KNOWN_PATTERNS
    : KNOWN_PATTERNS.filter(p => p.category === filter)

  // Sortieren: persönlich erkannte zuerst
  const sorted = [...filteredPatterns].sort((a, b) => {
    const aPersonal = personalPatterns.some(p => p.pattern_key === a.key)
    const bPersonal = personalPatterns.some(p => p.pattern_key === b.key)
    if (aPersonal && !bPersonal) return -1
    if (!aPersonal && bPersonal) return 1
    return 0
  })

  return (
    <div className="px-5 pt-12 pb-24">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-[26px] font-display text-ink">Verstehen</h1>
          <span className="bg-accent-light text-accent text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-[0.05em]">Neu</span>
        </div>
        <p className="text-[13px] text-ink-3">MODUL · MUSTER ERKENNEN</p>
      </div>

      {/* Hero */}
      <div className="mb-6">
        <h2 className="font-display text-[22px] text-ink leading-[1.3] mb-2">
          Warum reagierst du oft so?
        </h2>
        <p className="text-[14px] text-ink-2 leading-relaxed">
          Muster sind keine Fehler. Sie entstanden, weil sie einmal die beste Lösung waren.
        </p>
      </div>

      {/* Coach-Banner — nur wenn persönliche Muster vorhanden */}
      {hasPersonalPatterns && (
        <div
          className="bg-accent rounded-xl p-5 mb-6 cursor-pointer"
          onClick={() => navigate('/verstehen/aus-gespraechen')}
        >
          <p className="text-[11px] text-white/70 uppercase tracking-[0.06em] mb-2">Dein Coach hat bemerkt</p>
          <p className="font-display text-[18px] text-white leading-[1.3] mb-3">
            In deinen letzten Gesprächen taucht ein Thema regelmäßig auf.
          </p>
          <span className="text-white text-[13px] font-medium">Zeig mir was →</span>
        </div>
      )}

      {/* Filter-Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-shrink-0 text-[13px] px-4 py-1.5 rounded-full border transition-all ${
              filter === f
                ? 'bg-accent text-white border-accent'
                : 'bg-surface border-[var(--color-border)] text-ink-2'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Muster-Liste */}
      <div className="flex flex-col gap-3">
        {sorted.map(pattern => {
          const isPersonal = personalPatterns.some(p => p.pattern_key === pattern.key)
          return (
            <button
              key={pattern.key}
              onClick={() => navigate(`/verstehen/${pattern.key}`)}
              className="w-full text-left bg-surface border border-[var(--color-border)] rounded-xl p-4 shadow-sm hover:shadow transition-all flex items-start gap-4"
            >
              <div className={`w-11 h-11 ${pattern.iconBg} rounded-lg flex items-center justify-center flex-shrink-0 text-xl`}>
                {pattern.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[15px] font-medium text-ink">{pattern.label}</p>
                  {isPersonal && (
                    <span className="bg-accent-light text-accent text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0">
                      Aus deinen Gesprächen
                    </span>
                  )}
                  {!isPersonal && (
                    <span className="bg-surface-2 text-ink-3 text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0">
                      Häufiges Muster
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-ink-2 leading-relaxed">{pattern.desc}</p>
              </div>
              <ChevronRight size={16} color="var(--color-ink-3)" className="flex-shrink-0 mt-1" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
