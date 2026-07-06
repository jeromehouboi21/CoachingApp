import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flame, Lock, ChevronRight } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

function ActivityDots({ count }) {
  const filled = Math.min(5, count)
  return (
    <div className="flex gap-0.5 flex-none">
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${i <= filled ? 'bg-premium' : 'bg-[var(--color-border)]'}`}
        />
      ))}
    </div>
  )
}

function NamedVoiceCard({ voice, linkedLabels, onTalk }) {
  return (
    <div className="bg-surface border border-[var(--color-border)] rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-display text-[17px] text-ink">{voice.name}</h3>
        <ActivityDots count={linkedLabels.length} />
      </div>
      {voice.description && (
        <p className="text-[13px] text-ink-2 leading-relaxed mb-3">{voice.description}</p>
      )}
      {linkedLabels.length > 0 && (
        <p className="text-[12px] text-ink-3 mb-4">
          Zeigt sich meist bei: {linkedLabels.slice(0, 3).join(', ')}
        </p>
      )}
      <button
        onClick={onTalk}
        className="text-[13px] text-accent font-medium flex items-center gap-0.5 hover:underline"
      >
        Mit {voice.name} sprechen <ChevronRight size={14} />
      </button>
    </div>
  )
}

function CandidateVoiceCard({ voice, linkedLabels, onTalk }) {
  return (
    <div className="bg-surface-2 border border-[var(--color-border)] rounded-xl p-5">
      <p className="text-[13px] text-ink-2 leading-relaxed mb-3">
        In deinen letzten Gesprächen und deiner Akte taucht wiederholt ein Thema
        auf — {voice.description || 'ein wiederkehrendes Muster, das noch keinen Namen hat.'}
      </p>
      {linkedLabels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {linkedLabels.slice(0, 3).map((label, i) => (
            <span
              key={i}
              className="text-[11px] bg-surface text-ink-2 px-2.5 py-1 rounded-full border border-[var(--color-border)]"
            >
              ↳ Verknüpft mit: {label} (Akte)
            </span>
          ))}
        </div>
      )}
      <button
        onClick={onTalk}
        className="text-[13px] text-accent font-medium flex items-center gap-0.5 hover:underline"
      >
        Darüber sprechen <ChevronRight size={14} />
      </button>
    </div>
  )
}

function LockedState({ onUpgrade }) {
  return (
    <div className="px-5 pt-12 pb-6">
      <div className="mb-8">
        <h1 className="font-display text-[24px] text-ink">Deine inneren Stimmen</h1>
        <p className="text-[13px] text-ink-3 mt-0.5">Wiederkehrende Anteile, die du selbst benannt hast</p>
      </div>
      <div className="bg-premium-light border border-[var(--color-premium)] rounded-xl p-6 text-center">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock size={20} className="text-premium" />
        </div>
        <p className="text-[15px] font-medium text-premium mb-1">Nur mit Premium</p>
        <p className="text-[13px] text-ink-2 mb-5">
          Erkenne wiederkehrende innere Anteile — und gib ihnen mit der Zeit einen Namen.
        </p>
        <button
          onClick={onUpgrade}
          className="bg-[var(--color-premium)] text-white text-[13px] font-medium px-5 py-2.5 rounded-full"
        >
          Premium entdecken
        </button>
      </div>
    </div>
  )
}

export function StimmenScreen() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const isPremium = profile?.plan === 'premium' || profile?.plan === 'tester'
  const [namedVoices, setNamedVoices] = useState([])
  const [candidateVoices, setCandidateVoices] = useState([])
  const [entriesByVoice, setEntriesByVoice] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !isPremium) { setLoading(false); return }
    Promise.all([
      supabase
        .from('inner_voices')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'named')
        .order('last_active_at', { ascending: false }),
      supabase
        .from('inner_voices')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'candidate')
        .not('introduced_at', 'is', null)
        .order('created_at', { ascending: false }),
      supabase
        .from('coach_file_entries')
        .select('label, voice_id')
        .eq('user_id', user.id)
        .not('voice_id', 'is', null),
    ]).then(([{ data: named }, { data: candidates }, { data: entries }]) => {
      setNamedVoices(named ?? [])
      setCandidateVoices(candidates ?? [])
      const grouped = {}
      for (const e of entries ?? []) {
        if (!grouped[e.voice_id]) grouped[e.voice_id] = []
        grouped[e.voice_id].push(e.label)
      }
      setEntriesByVoice(grouped)
      setLoading(false)
    })
  }, [user, isPremium])

  if (!isPremium) {
    return <LockedState onUpgrade={() => navigate('/premium')} />
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <span key={i} className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  const hasAnything = namedVoices.length > 0 || candidateVoices.length > 0

  return (
    <div className="px-5 pt-12 pb-6">
      <div className="mb-8">
        <h1 className="font-display text-[24px] text-ink">Deine inneren Stimmen</h1>
        <p className="text-[13px] text-ink-3 mt-0.5">Wiederkehrende Anteile, die du selbst benannt hast</p>
      </div>

      {!hasAnything && (
        <div className="flex flex-col items-center text-center py-16 px-6">
          <div className="w-16 h-16 bg-premium-light rounded-full flex items-center justify-center mb-5">
            <Flame size={24} color="var(--color-premium)" />
          </div>
          <h3 className="font-display text-[18px] text-ink mb-2">Deine Stimmen zeigen sich erst mit der Zeit</h3>
          <p className="text-[14px] text-ink-2 leading-relaxed max-w-xs mb-5">
            Je mehr du mit deinem Coach sprichst, desto klarer wird das Bild.
          </p>
          <button
            onClick={() => navigate('/coach')}
            className="bg-accent text-white text-[13px] font-medium px-5 py-2.5 rounded-full hover:bg-accent-2 transition-colors"
          >
            Gespräch beginnen →
          </button>
        </div>
      )}

      {namedVoices.length > 0 && (
        <div className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.06em] font-medium text-premium mb-3">BEREITS BENANNT</p>
          <div className="flex flex-col gap-3">
            {namedVoices.map(voice => (
              <NamedVoiceCard
                key={voice.id}
                voice={voice}
                linkedLabels={entriesByVoice[voice.id] ?? []}
                onTalk={() => navigate('/coach')}
              />
            ))}
          </div>
        </div>
      )}

      {candidateVoices.length > 0 && (
        <div className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.06em] font-medium text-ink-3 mb-3">ZEIGT SICH, ABER NOCH UNBENANNT</p>
          <div className="flex flex-col gap-3">
            {candidateVoices.map(voice => (
              <CandidateVoiceCard
                key={voice.id}
                voice={voice}
                linkedLabels={entriesByVoice[voice.id] ?? []}
                onTalk={() => navigate('/coach')}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
