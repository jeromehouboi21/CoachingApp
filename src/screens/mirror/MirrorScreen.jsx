import { useState, useEffect } from 'react'
import { Pin, Trash2, BookOpen } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const CATEGORIES = [
  { id: 'all', label: 'Alle' },
  { id: 'muster', label: 'Muster' },
  { id: 'stärke', label: 'Stärken' },
  { id: 'erkenntnis', label: 'Erkenntnisse' },
  { id: 'ziel', label: 'Ziele' },
]

const CATEGORY_STYLES = {
  muster:     { bg: 'bg-accent-light',   text: 'text-accent',   label: 'Muster' },
  stärke:     { bg: 'bg-[#E6F4EA]',      text: 'text-[#2D7A3A]', label: 'Stärke' },
  erkenntnis: { bg: 'bg-premium-light',  text: 'text-premium',  label: 'Erkenntnis' },
  ziel:       { bg: 'bg-coral-light',    text: 'text-coral',    label: 'Ziel' },
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

function EmptyState() {
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

export function MirrorScreen() {
  const { user } = useAuth()
  const [insights, setInsights] = useState([])
  const [activeFilter, setActiveFilter] = useState('all')
  const [loading, setLoading] = useState(true)

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
      <div className="mb-6">
        <h1 className="font-display text-[24px] text-ink">Mein Spiegel</h1>
        <p className="text-[13px] text-ink-3 mt-0.5">Was du über dich verstanden hast</p>
      </div>

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

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="flex gap-1">
            {[0,1,2].map(i => (
              <span key={i} className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState />
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
    </div>
  )
}
