import { useCallback, useEffect, useState } from 'react'
import { BookOpen } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { createLogger } from '../../lib/logger'
import { LoadingDots, LoadError, SectionLabel, formatDay } from './shared'

const logger = createLogger('DevelopmentLevel')

// Ebene „Entwicklung“ (bisher „Deine Akte“, UX-Konzept 4.3c, E-U2-5).
// Zeitachse vorne, eine Farbe, beschreibende Texte statt Neu/Update/Aufgelöst (E-U2-4).
// Akte-Muster leben in der Ebene „Muster“.

function timelineText(item) {
  if (item.action === 'resolve' || item.new_status === 'resolved') return 'zeigt sich gerade kaum'
  if (item.new_status === 'fading') return 'seltener in den letzten Gesprächen'
  if (item.action === 'add') return 'zum ersten Mal bemerkt'
  return 'neue Beobachtung'
}

const chip = 'text-[12px] bg-surface-2 text-ink-2 px-3 py-1.5 rounded-full border border-[var(--color-border)]'

export function DevelopmentLevel({ userId }) {
  const [data, setData] = useState(null)
  const [loadFailed, setLoadFailed] = useState(false)

  const load = useCallback(() => {
    if (!userId) return
    setData(null)
    setLoadFailed(false)
    Promise.all([
      supabase.from('coach_file_entries')
        .select('id, category, label, description')
        .eq('user_id', userId)
        .in('category', ['strength', 'trigger', 'value'])
        .order('confidence', { ascending: false })
        .order('first_detected', { ascending: true }),
      supabase.from('coachee_profile').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('session_notes')
        .select('created_at, file_updates')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
    ]).then(([entriesRes, profileRes, notesRes]) => {
      const failed = [entriesRes, profileRes, notesRes].find(r => r.error)
      if (failed) {
        logger.error('development_load_failed', { code: failed.error.code })
        setLoadFailed(true)
        return
      }
      const notes = notesRes.data ?? []
      // neueste zuerst; innerhalb eines Gesprächs in der gespeicherten Reihenfolge
      const timeline = notes.flatMap(s =>
        (Array.isArray(s.file_updates) ? s.file_updates : []).map(u => ({
          date: s.created_at, action: u.action, label: u.label, note: u.note, new_status: u.new_status,
        }))
      )
      setData({ entries: entriesRes.data ?? [], profile: profileRes.data, timeline, conversationCount: notes.length })
    })
  }, [userId])

  useEffect(() => { load() }, [load])

  if (loadFailed) return <LoadError onRetry={load} />
  if (!data) return <LoadingDots />

  const strengths = data.entries.filter(e => e.category === 'strength')
  const reactions = data.entries.filter(e => e.category === 'trigger' || e.category === 'value')
  const p = data.profile
  const contextChips = p ? [
    p.occupation && `Beruf: ${p.occupation}`,
    p.life_phase && `Lebensphase: ${p.life_phase}`,
    p.current_focus && `Fokus: ${p.current_focus}`,
    p.relationship_status,
    p.family_situation,
  ].filter(Boolean) : []

  const isEmpty = !data.timeline.length && !strengths.length && !reactions.length && !contextChips.length

  return (
    <div>
      <div className="mb-5">
        <p className="text-[15px] text-ink">Was sich bei dir bewegt</p>
        {data.conversationCount > 0 && (
          <p className="text-[12px] text-ink-3 mt-0.5">
            Aus {data.conversationCount} {data.conversationCount === 1 ? 'Gespräch' : 'Gesprächen'}
          </p>
        )}
      </div>

      {isEmpty && (
        <div className="flex flex-col items-center text-center py-12 px-6">
          <div className="w-14 h-14 bg-accent-light rounded-full flex items-center justify-center mb-4">
            <BookOpen size={22} color="var(--color-accent)" />
          </div>
          <h3 className="font-display text-[18px] text-ink mb-2">Deine Entwicklung wächst mit dir</h3>
          <p className="text-[13px] text-ink-2 leading-relaxed max-w-xs">
            Nach deinen ersten Gesprächen zeigt sich hier, was dich ausmacht und was sich bewegt.
          </p>
        </div>
      )}

      {data.timeline.length > 0 && (
        <section className="mb-7">
          <SectionLabel>Deine Entwicklung</SectionLabel>
          <div className="flex flex-col gap-4">
            {data.timeline.map((item, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="w-2 h-2 rounded-full bg-accent flex-none mt-1.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-ink-3 mb-0.5">{formatDay(item.date, true)}</p>
                  <p className="text-[13px] text-ink">
                    {item.label}: <span className="text-ink-2">{timelineText(item)}</span>
                  </p>
                  {item.note && <p className="text-[12px] text-ink-3 mt-0.5 leading-relaxed">{item.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {strengths.length > 0 && (
        <section className="mb-7">
          <SectionLabel>Deine Stärken</SectionLabel>
          <div className="flex flex-col gap-2">
            {strengths.map(e => (
              <div key={e.id} className="bg-surface border border-[var(--color-border)] rounded-lg p-3">
                <p className="text-[14px] font-medium text-ink">{e.label}</p>
                {e.description && <p className="text-[12px] text-ink-3 mt-0.5">{e.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {reactions.length > 0 && (
        <section className="mb-7">
          <SectionLabel>Wie du reagierst</SectionLabel>
          <div className="flex flex-col gap-2">
            {reactions.map(e => (
              <div key={e.id} className="bg-surface border border-[var(--color-border)] rounded-lg p-3">
                <p className="text-[13px] text-ink">{e.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {contextChips.length > 0 && (
        <section className="mb-4">
          <SectionLabel>Dein Alltag</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {contextChips.map((c, i) => <span key={i} className={chip}>{c}</span>)}
          </div>
          <p className="text-[11px] text-ink-3 mt-2 leading-relaxed">
            Wird aus deinen Gesprächen abgeleitet, du wirst nicht danach gefragt.
          </p>
        </section>
      )}
    </div>
  )
}
