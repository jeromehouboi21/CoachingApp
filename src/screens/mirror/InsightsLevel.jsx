import { useCallback, useEffect, useState } from 'react'
import { Pin, Trash2, BookOpen } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { createLogger } from '../../lib/logger'
import { LoadingDots, LoadError, formatDay } from './shared'
import { SuggestionActions } from '../../components/insights/SuggestionActions'
import { InsightRating } from '../../components/insights/InsightRating'

const logger = createLogger('InsightsLevel')

// Ebene „Erkenntnisse“ (UX-Konzept 4.3a). `muster` erscheint nur unter „Alle“.
const FILTERS = [
  { id: 'all', label: 'Alle' },
  { id: 'erkenntnis', label: 'Erkenntnisse' },
  { id: 'stärke', label: 'Stärken' },
  { id: 'ziel', label: 'Vorhaben' },
  { id: 'helpful', label: 'Hat mich weitergebracht ✦' },   // U5a: nur eigene Markierungen
]

const CATEGORY_LABELS = {
  muster: 'Muster',
  stärke: 'Stärke',
  erkenntnis: 'Erkenntnis',
  ziel: 'Vorhaben',
}

function InsightCard({ insight, busy, onPin, onDelete, onSuggestionDone, onUpdated, onRemoved }) {
  return (
    <div className="bg-surface border border-[var(--color-border)] rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        {/* eine neutrale Farbe für alle Kategorien – keine Wertung über Farbe (E-U2-4) */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium px-[10px] py-[3px] rounded-full uppercase tracking-[0.04em] bg-surface-2 text-ink-2">
            {CATEGORY_LABELS[insight.category] || 'Erkenntnis'}
          </span>
          {/* ✦ nur dort, wo der Mensch selbst markiert hat (U5a) */}
          {insight.user_rating === 'helpful' && (
            <span className="text-[14px] text-accent" title="Hat mich weitergebracht" aria-label="Hat mich weitergebracht">✦</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPin(insight)}
            disabled={busy}
            aria-label={insight.is_pinned ? 'Nicht mehr anheften' : 'Anheften'}
            className={`p-1 rounded transition-colors disabled:opacity-50 ${insight.is_pinned ? 'text-accent' : 'text-ink-3 hover:text-ink-2'}`}
          >
            <Pin size={14} fill={insight.is_pinned ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={() => onDelete(insight)}
            disabled={busy}
            aria-label="Entfernen"
            className="p-1 rounded text-ink-3 hover:text-ink-2 transition-colors disabled:opacity-50"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <p className="text-[15px] text-ink leading-[1.6] mb-2">{insight.content}</p>
      <p className="text-[11px] text-ink-3">Vom {formatDay(insight.created_at)}</p>
      {/* U3: automatisch entstanden, noch nicht bestätigt → dezenter Vorschlag */}
      {insight.source === 'auto' && (
        <SuggestionActions insight={insight} question="Vorschlag – stimmt das?" onDone={(r) => onSuggestionDone(insight, r)} />
      )}
      {/* U5a: Deine Einschätzung · Daran weiterarbeiten */}
      <InsightRating insight={insight} onUpdated={(f) => onUpdated(insight, f)} onRemoved={() => onRemoved(insight)} />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center text-center py-16 px-6">
      <div className="w-16 h-16 bg-accent-light rounded-full flex items-center justify-center mb-5">
        <BookOpen size={24} color="var(--color-accent)" />
      </div>
      <h3 className="font-display text-[20px] text-ink mb-2">Noch keine Erkenntnisse</h3>
      <p className="text-[14px] text-ink-2 leading-relaxed max-w-xs">
        Deine ersten Erkenntnisse entstehen im Gespräch. Am Ende kannst du festhalten, was du mitnimmst.
      </p>
    </div>
  )
}

export function InsightsLevel({ userId }) {
  const [insights, setInsights] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState(false)

  const load = useCallback(() => {
    if (!userId) return
    setLoading(true)
    setLoadFailed(false)
    supabase
      .from('insights')
      .select('*')
      .eq('user_id', userId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          logger.error('insights_load_failed', { code: error.code })
          setLoadFailed(true)
        } else {
          setInsights(data || [])
        }
        setLoading(false)
      })
  }, [userId])

  useEffect(() => { load() }, [load])

  // UI ändert sich erst nach bestätigtem Write (kein stilles Scheitern, E-U2-8)
  const handlePin = async (insight) => {
    setBusyId(insight.id)
    setActionError(false)
    const pinned = !insight.is_pinned
    // .select() bestätigt, dass wirklich eine Zeile geändert wurde (RLS liefert sonst still 0 Zeilen)
    const { data, error } = await supabase.from('insights').update({ is_pinned: pinned }).eq('id', insight.id).select('id')
    if (error || !data?.length) {
      logger.error('insight_pin_failed', { code: error?.code ?? 'no_rows' })
      setActionError(true)
    } else {
      setInsights(prev => prev.map(i => i.id === insight.id ? { ...i, is_pinned: pinned } : i))
    }
    setBusyId(null)
  }

  const handleDelete = async (insight) => {
    setBusyId(insight.id)
    setActionError(false)
    const { data, error } = await supabase.from('insights').delete().eq('id', insight.id).select('id')
    if (error || !data?.length) {
      logger.error('insight_delete_failed', { code: error?.code ?? 'no_rows' })
      setActionError(true)
    } else {
      setInsights(prev => prev.filter(i => i.id !== insight.id))
    }
    setBusyId(null)
  }

  const handleSuggestionDone = (insight, result) => {
    if (result.action === 'removed') {
      setInsights(prev => prev.filter(i => i.id !== insight.id))
    } else {
      setInsights(prev => prev.map(i => i.id === insight.id ? { ...i, source: 'user', content: result.content ?? i.content } : i))
    }
  }

  const handleUpdated = (insight, fields) =>
    setInsights(prev => prev.map(i => i.id === insight.id ? { ...i, ...fields } : i))
  const handleRemoved = (insight) => setInsights(prev => prev.filter(i => i.id !== insight.id))

  const filtered = filter === 'all' ? insights
    : filter === 'helpful' ? insights.filter(i => i.user_rating === 'helpful')
    : insights.filter(i => i.category === filter)

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-1 mb-5 scrollbar-none">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex-none text-[13px] font-medium px-4 py-1.5 rounded-full border transition-all ${
              filter === f.id
                ? 'bg-accent text-white border-accent'
                : 'bg-surface text-ink-2 border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {actionError && (
        <p role="alert" className="text-[13px] text-ink-2 bg-surface-2 rounded-lg px-4 py-3 mb-4">
          Das hat gerade nicht geklappt. Versuch es bitte noch einmal.
        </p>
      )}

      {loading ? (
        <LoadingDots />
      ) : loadFailed ? (
        <LoadError onRetry={load} />
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(insight => (
            <InsightCard
              key={insight.id}
              insight={insight}
              busy={busyId === insight.id}
              onPin={handlePin}
              onDelete={handleDelete}
              onSuggestionDone={handleSuggestionDone}
              onUpdated={handleUpdated}
              onRemoved={handleRemoved}
            />
          ))}
        </div>
      )}
    </>
  )
}
