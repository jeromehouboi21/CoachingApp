import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Info, ChevronRight } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { ProfileButton } from '../../components/layout/ProfileButton'
import { HiddenInsightCard } from '../../components/today/HiddenInsightCard'
import { DailyImpulseCard } from '../../components/today/DailyImpulseCard'
import { relativeLabel } from '../../components/coach/ConversationEntry'
import { getDailyImpulse } from '../../lib/prompts'
import { supabase } from '../../lib/supabase'
import { createLogger } from '../../lib/logger'
import { dismissInsight, markSurfaced } from '../../lib/insightActions'
import { chooseTodayState } from '../../lib/todayState'
import { TrialEndCard } from '../../components/today/TrialEndCard'
import { useAccessState, seenOnce, markSeen, TRIAL_END_CARD_KEY } from '../../lib/accessState'

const logger = createLogger('HomeScreen')

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Guten Morgen'
  if (h < 18) return 'Guten Tag'
  return 'Guten Abend'
}

export function HomeScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const impulse = getDailyImpulse()
  const [today, setToday] = useState(null)   // { state, insight? }
  const [hidden, setHidden] = useState(false) // Karte per „Heute nicht“ oder Entfernen weggeschoben

  useEffect(() => {
    if (!user) return
    let cancelled = false
    Promise.all([
      supabase.rpc('get_conversation_history'),
      supabase.from('insights')
        .select('id, content, category, source, created_at, surfaced_at, confirmed_at, dismissed_at, user_rating, conversation_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(300),
    ]).then(([convRes, insRes]) => {
      if (cancelled) return
      if (convRes.error || insRes.error) {
        // Heute bleibt nutzbar (Tagesimpuls), der Fehler wird protokolliert
        logger.error('today_load_failed', { code: convRes.error?.code ?? insRes.error?.code })
        setToday({ state: 'C' })
        return
      }
      const choice = chooseTodayState(convRes.data ?? [], insRes.data ?? [])
      setToday(choice)
      // Wiederentdecken zählt als gezeigt, sobald die Karte erscheint (auch ohne Antippen)
      if (choice.state === 'C2') markSurfaced(choice.insight.id)
    })
    return () => { cancelled = true }
  }, [user])

  const talkAboutImpulse = () => navigate('/coach', { state: { entryContext: { source: 'tagesimpuls', impulse } } })
  const state = hidden && (today?.state === 'B' || today?.state === 'C2') ? 'C' : today?.state

  // U4, Übergangstext 2: Ende des Kennenlernens (Standardgrenze 3), einmal pro Gerät, nicht in A/D
  const { access } = useAccessState()
  const [endCardClosed, setEndCardClosed] = useState(false)
  const showEndCard = !!user && !endCardClosed && access?.phase === 'ruhemodus' && access.starts_limit === 3
    && state && state !== 'A' && state !== 'D' && !seenOnce(TRIAL_END_CARD_KEY, user.id)
  const closeEndCard = () => { markSeen(TRIAL_END_CARD_KEY, user.id); setEndCardClosed(true) }

  return (
    <div className="px-5 pt-12 pb-6">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-[13px] text-ink-3 mb-1">{getGreeting()}</p>
          <h1 className="font-display text-[26px] text-ink leading-[1.2]">
            Was bewegt dich <em>heute?</em>
          </h1>
        </div>
        <ProfileButton />
      </div>

      {!today && (
        <div className="flex justify-center py-16">
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <span key={i} className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      )}

      {/* E – Ende des Kennenlernens (U4) */}
      {showEndCard && <TrialEndCard onClose={closeEndCard} />}

      {/* A – Neu */}
      {state === 'A' && (
        <>
          <div className="bg-surface border border-[var(--color-border)] rounded-xl p-5 mb-4">
            <p className="text-[11px] text-accent uppercase tracking-[0.06em] font-medium mb-2">So funktioniert's</p>
            <p className="text-[14px] text-ink-2 leading-relaxed">
              Du bringst ein Thema mit. Der Begleiter stellt Fragen. Was du erkennst, sammelt sich im Spiegel.
            </p>
          </div>
          <button
            onClick={() => navigate('/coach')}
            className="w-full bg-accent text-white text-[15px] font-medium py-4 rounded-full hover:bg-accent-2 transition-colors mb-4"
          >
            Erstes Gespräch beginnen
          </button>
          <WellnessLink onClick={() => navigate('/wellness')} />
        </>
      )}

      {/* D – Heute schon gesprochen */}
      {state === 'D' && (
        <div className="bg-surface border border-[var(--color-border)] rounded-xl p-5 mb-6">
          <p className="font-display text-[18px] text-ink leading-[1.4] mb-1">Du warst heute schon im Gespräch.</p>
          <p className="text-[14px] text-ink-2 mb-4">Lass es ruhig nachwirken.</p>
          <button onClick={() => navigate('/mirror')} className="text-[13px] text-accent font-medium hover:underline">
            Was du erkannt hast → Spiegel
          </button>
        </div>
      )}

      {/* B – Nachklang */}
      {state === 'B' && (
        <>
          <HiddenInsightCard
            heading="Aus deinem letzten Gespräch"
            insight={today.insight}
            continueLabel="Wie war es seitdem? Daran weiterarbeiten →"
            onReveal={() => markSurfaced(today.insight.id)}
            onDismiss={async () => {
              const { ok } = await dismissInsight(today.insight.id)
              if (ok) setHidden(true)
              return ok
            }}
            onSuggestionDone={(r) => { if (r.action === 'removed') setHidden(true) }}
          />
          <DailyImpulseCard impulse={impulse} onTalk={talkAboutImpulse} compact />
        </>
      )}

      {/* C2 – Wiederentdecken */}
      {state === 'C2' && (
        <>
          <HiddenInsightCard
            heading={`${capitalize(relativeLabel(today.insight.created_at))} hast du etwas erkannt.`}
            insight={today.insight}
            onSuggestionDone={(r) => { if (r.action === 'removed') setHidden(true) }}
          />
          <WellnessLink onClick={() => navigate('/wellness')} />
          <TalkLink onClick={() => navigate('/coach')} />
        </>
      )}

      {/* C – Ruhe */}
      {state === 'C' && (
        <>
          <DailyImpulseCard impulse={impulse} onTalk={talkAboutImpulse} />
          <WellnessLink onClick={() => navigate('/wellness')} />
          <TalkLink onClick={() => navigate('/coach')} />
        </>
      )}

      {today && (
        <button onClick={() => navigate('/howto')} className="w-full flex items-center gap-2 mt-8 text-left">
          <Info size={14} color="var(--color-ink-3)" />
          <span className="flex-1 text-[13px] text-ink-3">Wie funktioniert die App?</span>
          <ChevronRight size={12} color="var(--color-ink-3)" />
        </button>
      )}
    </div>
  )
}

function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}

function WellnessLink({ onClick }) {
  return (
    <button onClick={onClick} className="block text-[14px] text-ink-2 hover:underline mb-2">
      Erst mal ankommen → Wie geht's dir?
    </button>
  )
}

function TalkLink({ onClick }) {
  return (
    <button onClick={onClick} className="block text-[14px] text-ink-2 hover:underline">
      Ins Gespräch →
    </button>
  )
}
