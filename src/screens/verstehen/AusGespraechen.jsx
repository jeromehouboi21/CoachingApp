import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { ChevronLeft, Lock } from 'lucide-react'

export function AusGespraechen() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [references, setReferences] = useState([])
  const [loading, setLoading] = useState(true)

  const isPremium = profile?.plan === 'premium'

  useEffect(() => {
    if (!user) return
    supabase
      .from('pattern_references')
      .select('id, pattern_key, pattern_label, excerpt, detected_at, conversation_id')
      .eq('user_id', user.id)
      .order('detected_at', { ascending: false })
      .then(({ data }) => {
        setReferences(data ?? [])
        setLoading(false)
      })
  }, [user])

  const formatDate = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <div className="px-5 pt-12 pb-6">
        <button
          onClick={() => navigate('/verstehen')}
          className="flex items-center gap-1 text-ink-3 text-[13px] mb-6"
        >
          <ChevronLeft size={16} />
          Zurück
        </button>
        <h1 className="font-display text-[24px] text-ink mb-2">Dein Coach hat bemerkt</h1>
        <p className="text-[14px] text-ink-2 leading-relaxed">
          Nicht als Urteil — sondern weil diese Momente zeigen,
          wo ein Muster aktiv sein könnte.
        </p>
      </div>

      <div className="px-5 pb-24">
        {loading && (
          <div className="flex gap-1 justify-center py-10">
            {[0, 1, 2].map(i => (
              <span key={i} className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        )}

        {!loading && references.length === 0 && (
          <div className="bg-surface border border-[var(--color-border)] rounded-xl p-6 text-center">
            <p className="text-[15px] text-ink-2">
              Dein Coach sammelt gerade Beobachtungen.
              Sie entstehen im Gespräch — mit der Zeit.
            </p>
            <button
              onClick={() => navigate('/coach', { state: { entryContext: { source: 'verstehen' } } })}
              className="mt-4 bg-accent text-white text-[13px] font-medium px-5 py-2.5 rounded-full hover:bg-accent-2 transition-colors"
            >
              Gespräch beginnen →
            </button>
          </div>
        )}

        {!loading && references.length > 0 && (
          <div className="flex flex-col gap-4">
            {references.map((ref, i) => {
              const isLocked = !isPremium && i > 0
              return (
                <div
                  key={ref.id}
                  className={`bg-surface border border-[var(--color-border)] rounded-xl p-5 relative ${isLocked ? 'opacity-60' : ''}`}
                >
                  {isLocked && (
                    <div className="absolute inset-0 rounded-xl flex flex-col items-center justify-center bg-surface/80 backdrop-blur-[2px] z-10">
                      <Lock size={20} color="var(--color-ink-3)" className="mb-2" />
                      <span className="text-[12px] text-ink-3 font-medium">Premium</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[11px] text-ink-3">{formatDate(ref.detected_at)}</span>
                    <span className="w-1 h-1 rounded-full bg-ink-3" />
                    <span className="bg-accent-light text-accent text-[10px] font-medium px-2 py-0.5 rounded-full">
                      {ref.pattern_label}
                    </span>
                  </div>
                  {ref.excerpt && (
                    <p className="text-[14px] text-ink-2 italic leading-relaxed mb-4">
                      "{ref.excerpt}"
                    </p>
                  )}
                  <button
                    onClick={() => navigate(`/verstehen/${ref.pattern_key}`)}
                    className="text-[13px] text-accent font-medium hover:underline"
                  >
                    Muster ansehen →
                  </button>
                </div>
              )
            })}

            {/* Mit dem Coach besprechen CTA */}
            <button
              onClick={() => {
                const dominant = references[0]
                navigate('/coach', { state: { entryContext: { source: 'pattern', topic: dominant.pattern_label, topicKey: dominant.pattern_key } } })
              }}
              className="w-full bg-accent text-white text-[14px] font-medium py-4 rounded-full hover:bg-accent-2 transition-colors"
            >
              Mit dem Coach besprechen →
            </button>

            {/* Premium-CTA wenn Free-Nutzer gesperrte Karten sieht */}
            {!isPremium && references.length > 1 && (
              <div className="bg-premium-light border border-[var(--color-premium)]/20 rounded-xl p-5 text-center">
                <p className="text-[14px] text-ink font-medium mb-1">Alle Beobachtungen freischalten</p>
                <p className="text-[13px] text-ink-2 mb-4">
                  Mit Premium siehst du jeden Moment, den dein Coach in deinen Gesprächen bemerkt hat.
                </p>
                <button
                  onClick={() => navigate('/premium')}
                  className="bg-accent text-white text-[13px] font-medium px-5 py-2.5 rounded-full hover:bg-accent-2 transition-colors"
                >
                  Premium entdecken →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
