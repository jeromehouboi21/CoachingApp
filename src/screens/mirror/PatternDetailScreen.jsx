import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useStreak } from '../../hooks/useStreak'
import { supabase } from '../../lib/supabase'
import { createLogger } from '../../lib/logger'
import { getPattern } from '../../lib/patterns'
import { formatDay } from './shared'
import { BookHints } from '../../components/book/BookHints'

const logger = createLogger('PatternDetailScreen')

// Muster-Detail /mirror/muster/:key (U2, E-U2-2) – nur für die fünf allgemeinen Muster.
// Vereint das frühere Verstehen-Detail mit „Aus deinen Gesprächen“: kurz erklärt · Deine Momente ·
// Entstehung in 3 Schritten · Was hilft · Darüber sprechen. Ohne eigene Momente entfällt der Abschnitt.
export function PatternDetailScreen() {
  const { key } = useParams()
  const navigate = useNavigate()
  const { user, profile, updateProfile } = useAuth()
  const { updateStreak } = useStreak()
  const [moments, setMoments] = useState([])
  const [momentsFailed, setMomentsFailed] = useState(false)

  const pattern = getPattern(key)

  useEffect(() => {
    if (!user || !pattern) return
    updateStreak(profile, updateProfile)
    supabase
      .from('pattern_references')
      .select('id, excerpt, detected_at')
      .eq('user_id', user.id)
      .eq('pattern_key', key)
      .order('detected_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          logger.error('pattern_moments_load_failed', { code: error.code })
          setMomentsFailed(true)
          return
        }
        setMoments((data ?? []).filter(m => m.excerpt))
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, key])

  if (!pattern) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-5 gap-4">
        <p className="text-ink-2">Dieses Muster gibt es hier nicht.</p>
        <button onClick={() => navigate('/mirror/muster')} className="text-[13px] text-accent font-medium hover:underline">
          Zu den Mustern →
        </button>
      </div>
    )
  }

  const handleStartChat = () => {
    navigate('/coach', { state: { entryContext: { source: 'pattern', topic: pattern.label, topicKey: key } } })
  }

  return (
    <div className="min-h-screen bg-bg max-w-lg mx-auto">
      <div className="bg-accent px-5 pt-12 pb-8">
        <button
          onClick={() => navigate('/mirror/muster')}
          className="flex items-center gap-1 text-white/70 text-[13px] mb-6"
        >
          <ChevronLeft size={16} />
          Zurück
        </button>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{pattern.icon}</span>
          <h1 className="font-display text-[24px] text-white leading-[1.2]">{pattern.label}</h1>
        </div>
        <p className="text-[14px] text-white/80">{pattern.subtitle}</p>
      </div>

      <div className="px-5 pb-24">
        {/* B1: Fundstellen im Buch, nur für Leser */}
        <BookHints patternKey={key} profile={profile} />

        {momentsFailed && (
          <p role="alert" className="text-[13px] text-ink-2 bg-surface-2 rounded-lg px-4 py-3 mt-6">
            Deine Momente ließen sich gerade nicht laden.
          </p>
        )}

        {moments.length > 0 && (
          <section className="mt-6">
            <h2 className="text-[17px] font-medium text-ink mb-3">Deine Momente</h2>
            <div className="flex flex-col gap-3">
              {moments.map(m => (
                <div key={m.id} className="bg-surface border border-[var(--color-border)] rounded-xl p-4">
                  <p className="text-[11px] text-ink-3 mb-2">{formatDay(m.detected_at)}</p>
                  <p className="text-[14px] text-ink-2 italic leading-relaxed">„{m.excerpt}“</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-6 mb-6">
          <h2 className="text-[17px] font-medium text-ink mb-4">Wie dieses Muster entsteht</h2>
          <div className="flex flex-col gap-4">
            {pattern.steps.map((step, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full bg-accent-light flex items-center justify-center flex-shrink-0">
                    <span className="text-[12px] font-medium text-accent">{i + 1}</span>
                  </div>
                  {i < pattern.steps.length - 1 && <div className="w-px flex-1 bg-[var(--color-border)] mt-2" />}
                </div>
                <div className="pb-4">
                  <p className="text-[14px] font-medium text-ink mb-1">{step.title}</p>
                  <p className="text-[13px] text-ink-2 leading-relaxed">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="bg-accent-light rounded-xl p-5 mb-6">
          <p className="text-[11px] text-accent uppercase tracking-[0.06em] font-medium mb-2">Was hilft</p>
          <p className="text-[14px] text-ink leading-relaxed">{pattern.action}</p>
        </div>

        <button
          onClick={handleStartChat}
          className="w-full bg-accent text-white text-[15px] font-medium py-4 rounded-full hover:bg-accent-2 transition-colors"
        >
          Darüber sprechen →
        </button>
      </div>
    </div>
  )
}
