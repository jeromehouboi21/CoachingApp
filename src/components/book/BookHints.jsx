// B1 Spiegel (Handoff 4.9): Fundstellen „Im Buch“ im Muster-Detail. Nur für Leser, höchstens 2,
// ohne Zitat und ohne Situation, ohne ⚠ (filtert die RPC get_book_hints). Fehler → nichts anzeigen.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { createLogger } from '../../lib/logger'
import { BOOK_REFERENCES_LIVE, BOOK_UI_TEXT as U } from '../../content/book'

const logger = createLogger('BookHints')

function partLabel(h) {
  return h.part_no >= 1 && h.part_no <= 7 && h.part_name !== 'Davor und danach'
    ? `Teil ${h.part_no} · ${h.part_name}`
    : h.part_name
}

export function BookHints({ patternKey, profile }) {
  const [hints, setHints] = useState([])
  const isReader = profile?.book_status === 'read' || profile?.book_status === 'reading'
  const visible = (BOOK_REFERENCES_LIVE || profile?.is_admin === true) && isReader

  useEffect(() => {
    if (!visible || !patternKey) { setHints([]); return }
    let cancelled = false
    supabase.rpc('get_book_hints', { p_pattern_key: patternKey }).then(({ data, error }) => {
      if (cancelled) return
      if (error) {
        logger.warn('book_hints_failed', { code: error.code ?? 'unknown' })
        setHints([])
        return
      }
      setHints((data ?? []).slice(0, 2))
    })
    return () => { cancelled = true }
  }, [visible, patternKey, profile?.book_status, profile?.book_progress])

  if (!visible || hints.length === 0) return null

  return (
    <section aria-labelledby="book-hints-title" className="bg-surface border border-[var(--color-border)] rounded-xl p-4 mt-6">
      <h2 id="book-hints-title" className="text-[11px] text-ink-3 uppercase tracking-[0.08em] font-medium mb-2">{U.mirrorEyebrow}</h2>
      <ul className="flex flex-col gap-1.5">
        {hints.map(h => (
          <li key={h.passage_id} className="text-[14px] text-ink-2 leading-snug">
            {partLabel(h)} – {h.scene_title}
          </li>
        ))}
      </ul>
      <Link
        to="/buch"
        state={{ from: 'mirror' }}
        className="mt-1 min-h-[44px] inline-flex items-center text-[13px] text-accent font-medium hover:underline"
      >
        {U.moreLink}
      </Link>
    </section>
  )
}
