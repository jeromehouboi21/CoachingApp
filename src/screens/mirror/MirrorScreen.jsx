import { useState, useEffect } from 'react'
import { Pin, Trash2, BookOpen, Lock, ChevronRight, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

// ─── Tab 1: Erkenntnisse ────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'all', label: 'Alle' },
  { id: 'muster', label: 'Muster' },
  { id: 'stärke', label: 'Stärken' },
  { id: 'erkenntnis', label: 'Erkenntnisse' },
  { id: 'ziel', label: 'Ziele' },
]

const CATEGORY_STYLES = {
  muster:     { bg: 'bg-accent-light',   text: 'text-accent',    label: 'Muster' },
  stärke:     { bg: 'bg-[#E6F4EA]',      text: 'text-[#2D7A3A]', label: 'Stärke' },
  erkenntnis: { bg: 'bg-premium-light',  text: 'text-premium',   label: 'Erkenntnis' },
  ziel:       { bg: 'bg-coral-light',    text: 'text-coral',     label: 'Ziel' },
}

function InsightCard({ insight, onPin, onDelete }) {
  const style = CATEGORY_STYLES[insight.category] || CATEGORY_STYLES.erkenntnis
  const date = new Date(insight.created_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })

  return (
    <div className="bg-surface border border-[var(--color-border)] rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <span className={`text-[11px] font-medium px-[10px] py-[3px] rounded-full uppercase tracking-[0.04em] ${style.bg} ${style.text}`}>
          {style.label}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPin(insight.id, !insight.is_pinned)}
            className={`p-1 rounded transition-colors ${insight.is_pinned ? 'text-accent' : 'text-ink-3 hover:text-ink-2'}`}
          >
            <Pin size={14} fill={insight.is_pinned ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={() => onDelete(insight.id)}
            className="p-1 rounded text-ink-3 hover:text-coral transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <p className="text-[15px] text-ink leading-[1.6] mb-2">{insight.content}</p>
      <p className="text-[11px] text-ink-3">Vom {date}</p>
    </div>
  )
}

function InsightsEmptyState() {
  return (
    <div className="flex flex-col items-center text-center py-16 px-6">
      <div className="w-16 h-16 bg-accent-light rounded-full flex items-center justify-center mb-5">
        <BookOpen size={24} color="var(--color-accent)" />
      </div>
      <h3 className="font-display text-[20px] text-ink mb-2">Noch keine Erkenntnisse</h3>
      <p className="text-[14px] text-ink-2 leading-relaxed max-w-xs">
        Deine ersten Erkenntnisse entstehen im Gespräch. Der Coach wird dich am Ende fragen, was du mitnimmst.
      </p>
    </div>
  )
}

// ─── Tab 2: Deine Akte ──────────────────────────────────────────────────────

function ConfidenceIndicator({ confidence }) {
  return (
    <div className="flex gap-0.5 flex-none">
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${i <= confidence ? 'bg-accent' : 'bg-[var(--color-border)]'}`}
        />
      ))}
    </div>
  )
}

function StatusBadge({ status }) {
  if (status === 'active') return null
  const styles = {
    fading:   'bg-premium-light text-premium',
    resolved: 'bg-[#E6F4EA] text-[#2D7A3A]',
  }
  const labels = {
    fading:   'Zeigt sich seltener',
    resolved: 'Aufgelöst',
  }
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${styles[status] || ''}`}>
      {labels[status] || status}
    </span>
  )
}

function MusterKarte({ entry, onVerlauf, locked = false }) {
  if (locked) {
    return (
      <div className="relative">
        <div className="bg-surface border border-[var(--color-border)] rounded-lg p-4 opacity-30 pointer-events-none select-none">
          <div className="flex items-start justify-between mb-2">
            <div className="h-4 bg-ink-3 rounded w-3/5" />
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-ink-3" />)}
            </div>
          </div>
          <div className="h-3 bg-ink-3 rounded w-full mb-1.5" />
          <div className="h-3 bg-ink-3 rounded w-4/5" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Lock size={18} className="text-ink-3" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-[var(--color-border)] rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <p className="text-[15px] font-medium text-ink flex-1 mr-3">{entry.label}</p>
        <ConfidenceIndicator confidence={entry.confidence} />
      </div>
      {entry.description && (
        <p className="text-[13px] text-ink-2 mb-2 leading-relaxed">{entry.description}</p>
      )}
      {entry.example && (
        <p className="text-[12px] italic text-ink-3 border-l-2 border-accent pl-3 mb-3 leading-relaxed">
          {entry.example}
        </p>
      )}
      <div className="flex items-center justify-between mt-1">
        <StatusBadge status={entry.status} />
        {entry.history?.length > 0 && (
          <button
            onClick={() => onVerlauf(entry)}
            className="text-[12px] text-accent flex items-center gap-0.5 ml-auto"
          >
            Verlauf <ChevronRight size={12} />
          </button>
        )}
      </div>
    </div>
  )
}

function VerlaufsSheet({ entry, onClose }) {
  if (!entry) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-surface w-full rounded-t-2xl max-h-[70vh] overflow-y-auto p-6 pb-10">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-[18px] text-ink">{entry.label} · Verlauf</h3>
          <button onClick={onClose} className="text-ink-3 p-1">
            <X size={20} />
          </button>
        </div>
        {entry.history?.length ? (
          <div className="flex flex-col gap-4">
            {entry.history.map((h, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-accent flex-none mt-1" />
                  {i < entry.history.length - 1 && (
                    <div className="w-px flex-1 bg-[var(--color-border)] mt-1" />
                  )}
                </div>
                <div className="pb-3 flex-1">
                  <p className="text-[11px] text-ink-3 mb-1">
                    {new Date(h.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-[13px] text-ink-2 leading-relaxed">{h.note}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-ink-3">Noch keine Verlaufsdaten.</p>
        )}
      </div>
    </div>
  )
}

function PremiumCTA({ onUpgrade }) {
  return (
    <div className="mt-4 bg-premium-light border border-[var(--color-premium)] rounded-xl p-5 text-center">
      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-3">
        <Lock size={18} className="text-premium" />
      </div>
      <p className="text-[14px] font-medium text-premium mb-1">Deine vollständige Akte freischalten</p>
      <p className="text-[12px] text-ink-3 mb-4">Sieh, wie du dich verändert hast.</p>
      <button
        onClick={onUpgrade}
        className="w-full bg-[var(--color-premium)] text-white text-[13px] font-medium py-2.5 rounded-full"
      >
        Premium entdecken
      </button>
    </div>
  )
}

function LockedRow() {
  return (
    <div className="relative">
      <div className="bg-surface border border-[var(--color-border)] rounded-lg p-3 flex items-center gap-3 opacity-30 pointer-events-none select-none">
        <div className="w-5 h-5 rounded bg-ink-3 flex-none" />
        <div className="h-3 bg-ink-3 rounded flex-1" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Lock size={14} className="text-ink-3" />
      </div>
    </div>
  )
}

function AkteTab({ userId, isPremium, onUpgrade }) {
  const [fileEntries, setFileEntries] = useState([])
  const [coacheeProfile, setCoacheeProfile] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [verlaufsEntry, setVerlaufsEntry] = useState(null)

  useEffect(() => {
    if (!userId) return
    Promise.all([
      supabase
        .from('coach_file_entries')
        .select('*')
        .eq('user_id', userId)
        .order('confidence', { ascending: false })
        .order('first_detected', { ascending: true }),
      supabase
        .from('coachee_profile')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('session_notes')
        .select('created_at, file_updates, main_topic')
        .eq('user_id', userId)
        .order('created_at', { ascending: true }),
    ]).then(([{ data: entries }, { data: profile }, { data: sessionHistory }]) => {
      setFileEntries(entries ?? [])
      setCoacheeProfile(profile)
      const tl = (sessionHistory ?? [])
        .filter(s => s.file_updates?.length > 0)
        .flatMap(s =>
          (s.file_updates ?? []).map(u => ({
            date: s.created_at,
            action: u.action,
            label: u.label,
            note: u.note,
            new_status: u.new_status,
          }))
        )
      setTimeline(tl)
      setLoading(false)
    })
  }, [userId])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <span key={i} className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  const patterns  = fileEntries.filter(e => e.category === 'pattern')
  const strengths = fileEntries.filter(e => e.category === 'strength')
  const triggers  = fileEntries.filter(e => e.category === 'trigger' || e.category === 'value')

  const lastUpdated = fileEntries.reduce((latest, e) => {
    return e.last_updated > latest ? e.last_updated : latest
  }, '')

  const hasAnyContext = coacheeProfile && (
    coacheeProfile.occupation || coacheeProfile.life_phase ||
    coacheeProfile.current_focus || coacheeProfile.relationship_status ||
    coacheeProfile.family_situation
  )

  return (
    <div>
      {/* Sub-header */}
      <div className="mb-5">
        <p className="text-[13px] text-ink-2">Was dein Coach über dich weiß</p>
        {lastUpdated && (
          <p className="text-[12px] text-ink-3 mt-0.5">
            Aus {fileEntries.length} Beobachtungen · Zuletzt: {new Date(lastUpdated).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })}
          </p>
        )}
      </div>

      {/* Empty state */}
      {!fileEntries.length && !hasAnyContext && (
        <div className="flex flex-col items-center text-center py-12 px-6">
          <div className="w-14 h-14 bg-accent-light rounded-full flex items-center justify-center mb-4">
            <BookOpen size={22} color="var(--color-accent)" />
          </div>
          <h3 className="font-display text-[18px] text-ink mb-2">Die Akte wächst mit dir</h3>
          <p className="text-[13px] text-ink-2 leading-relaxed max-w-xs">
            Nach deinen ersten Gesprächen beginnt der Coach, Muster und Stärken zu erkennen.
          </p>
        </div>
      )}

      {/* Section 1: Muster */}
      {patterns.length > 0 && (
        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.06em] font-medium text-accent mb-3">DEINE MUSTER</p>
          <div className="flex flex-col gap-2">
            {(isPremium ? patterns : patterns.slice(0, 1)).map(e => (
              <MusterKarte key={e.id} entry={e} onVerlauf={setVerlaufsEntry} />
            ))}
            {!isPremium && patterns.length > 1 && (
              <MusterKarte entry={patterns[1]} onVerlauf={setVerlaufsEntry} locked />
            )}
          </div>
          {!isPremium && patterns.length > 2 && (
            <p className="text-[12px] text-ink-3 text-center mt-2">
              + {patterns.length - 2} weitere gesperrt
            </p>
          )}
        </div>
      )}

      {/* Section 2: Stärken */}
      {strengths.length > 0 && (
        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.06em] font-medium text-[#2D7A3A] mb-3">DEINE STÄRKEN</p>
          <div className="flex flex-col gap-2">
            {(isPremium ? strengths : strengths.slice(0, 1)).map(e => (
              <div key={e.id} className="bg-surface border border-[var(--color-border)] rounded-lg p-3 flex items-center gap-3">
                <span className="text-[#2D7A3A] text-base flex-none">✦</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-ink">{e.label}</p>
                  {e.description && <p className="text-[12px] text-ink-3 mt-0.5">{e.description}</p>}
                </div>
                <ConfidenceIndicator confidence={e.confidence} />
              </div>
            ))}
            {!isPremium && strengths.length > 1 && <LockedRow />}
          </div>
          {!isPremium && strengths.length > 2 && (
            <p className="text-[12px] text-ink-3 text-center mt-2">
              + {strengths.length - 2} weitere gesperrt
            </p>
          )}
        </div>
      )}

      {/* Section 3: Kontext */}
      {hasAnyContext && (
        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.06em] font-medium text-ink-3 mb-3">DEIN KONTEXT</p>
          <div className="flex flex-wrap gap-2">
            {coacheeProfile.occupation && (
              <span className="text-[12px] bg-surface-2 text-ink-2 px-3 py-1.5 rounded-full border border-[var(--color-border)]">
                Beruf: {coacheeProfile.occupation}
              </span>
            )}
            {coacheeProfile.life_phase && (
              <span className="text-[12px] bg-surface-2 text-ink-2 px-3 py-1.5 rounded-full border border-[var(--color-border)]">
                {coacheeProfile.life_phase}
              </span>
            )}
            {coacheeProfile.current_focus && (
              <span className="text-[12px] bg-surface-2 text-ink-2 px-3 py-1.5 rounded-full border border-[var(--color-border)]">
                Fokus: {coacheeProfile.current_focus}
              </span>
            )}
            {coacheeProfile.relationship_status && (
              <span className="text-[12px] bg-surface-2 text-ink-2 px-3 py-1.5 rounded-full border border-[var(--color-border)]">
                {coacheeProfile.relationship_status}
              </span>
            )}
            {coacheeProfile.family_situation && (
              <span className="text-[12px] bg-surface-2 text-ink-2 px-3 py-1.5 rounded-full border border-[var(--color-border)]">
                {coacheeProfile.family_situation}
              </span>
            )}
          </div>
          <p className="text-[11px] text-ink-3 mt-2 leading-relaxed">
            Dieser Kontext wird aus deinen Gesprächen abgeleitet — du wirst nie direkt danach gefragt.
          </p>
        </div>
      )}

      {/* Section 4: Wie du reagierst */}
      {triggers.length > 0 && (
        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.06em] font-medium text-coral mb-3">WIE DU REAGIERST</p>
          <div className="flex flex-col gap-2">
            {(isPremium ? triggers : triggers.slice(0, 1)).map(e => (
              <div key={e.id} className="bg-surface border border-[var(--color-border)] rounded-lg p-3 flex items-center gap-3">
                <span className="text-base flex-none">{e.category === 'trigger' ? '⚡' : '♥'}</span>
                <p className="text-[13px] text-ink flex-1">{e.label}</p>
              </div>
            ))}
            {!isPremium && triggers.length > 1 && <LockedRow />}
          </div>
          {!isPremium && triggers.length > 2 && (
            <p className="text-[12px] text-ink-3 text-center mt-2">
              + {triggers.length - 2} weitere gesperrt
            </p>
          )}
        </div>
      )}

      {/* Zeitachse — nur Premium */}
      {isPremium && (
        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.06em] font-medium text-ink-3 mb-3">DEINE ENTWICKLUNG</p>
          {timeline.length > 0 ? (
            <div className="flex flex-col gap-3">
              {timeline.map((item, i) => {
                const isNew      = item.action === 'add'
                const isResolved = item.action === 'resolve' || item.new_status === 'resolved'
                const colorClass = isNew
                  ? 'text-accent bg-accent-light'
                  : isResolved
                  ? 'text-[#2D7A3A] bg-[#E6F4EA]'
                  : 'text-premium bg-premium-light'
                const actionLabel = isNew ? 'Neu' : isResolved ? 'Aufgelöst' : 'Update'

                return (
                  <div key={i} className="flex gap-3 items-start">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex-none mt-0.5 ${colorClass}`}>
                      {actionLabel}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-ink">{item.label}</p>
                      {item.note && <p className="text-[12px] text-ink-3 mt-0.5">{item.note}</p>}
                      <p className="text-[11px] text-ink-3 mt-0.5">
                        {new Date(item.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-[13px] text-ink-3 leading-relaxed">
              Deine Zeitachse wächst mit jedem Gespräch. Ab dem dritten Gespräch wird sie sichtbar.
            </p>
          )}
        </div>
      )}

      {/* Premium CTA für Free-Nutzer */}
      {!isPremium && <PremiumCTA onUpgrade={onUpgrade} />}

      {/* Verlaufs-Sheet */}
      <VerlaufsSheet entry={verlaufsEntry} onClose={() => setVerlaufsEntry(null)} />
    </div>
  )
}

// ─── Haupt-Screen ────────────────────────────────────────────────────────────

export function MirrorScreen() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('erkenntnisse')
  const [insights, setInsights] = useState([])
  const [activeFilter, setActiveFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  const isPremium = profile?.plan === 'premium'

  useEffect(() => {
    if (!user) return
    supabase
      .from('insights')
      .select('*')
      .eq('user_id', user.id)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setInsights(data || [])
        setLoading(false)
      })
  }, [user])

  const handlePin = async (id, pinned) => {
    await supabase.from('insights').update({ is_pinned: pinned }).eq('id', id)
    setInsights(prev => prev.map(i => i.id === id ? { ...i, is_pinned: pinned } : i))
  }

  const handleDelete = async (id) => {
    await supabase.from('insights').delete().eq('id', id)
    setInsights(prev => prev.filter(i => i.id !== id))
  }

  const filtered = activeFilter === 'all'
    ? insights
    : insights.filter(i => i.category === activeFilter)

  return (
    <div className="px-5 pt-12 pb-6">
      {/* Header */}
      <div className="mb-5">
        <h1 className="font-display text-[24px] text-ink">Mein Spiegel</h1>
        <p className="text-[13px] text-ink-3 mt-0.5">Was du über dich verstanden hast</p>
      </div>

      {/* Tab-Navigation */}
      <div className="flex gap-1 bg-surface-2 p-1 rounded-full mb-5">
        <button
          onClick={() => setActiveTab('erkenntnisse')}
          className={`flex-1 text-[13px] font-medium py-1.5 rounded-full transition-all ${
            activeTab === 'erkenntnisse'
              ? 'bg-surface text-ink shadow-sm'
              : 'text-ink-3'
          }`}
        >
          Erkenntnisse
        </button>
        <button
          onClick={() => setActiveTab('akte')}
          className={`flex-1 text-[13px] font-medium py-1.5 rounded-full transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'akte'
              ? 'bg-surface text-ink shadow-sm'
              : 'text-ink-3'
          }`}
        >
          Deine Akte
          {!isPremium && <Lock size={11} />}
        </button>
      </div>

      {/* Tab 1: Erkenntnisse */}
      {activeTab === 'erkenntnisse' && (
        <>
          {/* Filter-Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 mb-5 scrollbar-none">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveFilter(cat.id)}
                className={`flex-none text-[13px] font-medium px-4 py-1.5 rounded-full border transition-all ${
                  activeFilter === cat.id
                    ? 'bg-accent text-white border-accent'
                    : 'bg-surface text-ink-2 border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <InsightsEmptyState />
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map(insight => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  onPin={handlePin}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Tab 2: Deine Akte */}
      {activeTab === 'akte' && (
        <AkteTab
          userId={user?.id}
          isPremium={isPremium}
          onUpgrade={() => navigate('/premium')}
        />
      )}
    </div>
  )
}
