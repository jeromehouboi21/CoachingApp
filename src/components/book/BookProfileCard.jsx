// T1 Buch-Seite (Handoff 4.7): Karte im Profil unter der Coaching-Karte. Bewusst nicht grün.
// Zwei getrennte Links, keine verschachtelten klickbaren Flächen.
import { Link } from 'react-router-dom'
import { BOOK, BOOK_UI_TEXT as U } from '../../content/book'
import { bookStatusLine } from '../../lib/bookStatus'

export function BookProfileCard({ status, progress }) {
  const line = bookStatusLine(status, progress, U)
  return (
    <div className="bg-surface border border-[var(--color-border)] rounded-xl p-4 mb-8">
      <div className="flex gap-4 items-start">
        <img
          src={BOOK.coverSrc}
          width={56}
          height={87}
          alt=""
          loading="lazy"
          decoding="async"
          className="w-[56px] h-[87px] rounded-[4px] shadow-[0_2px_8px_rgba(26,25,22,0.15)] shrink-0 object-cover"
        />
        <div className="pt-1">
          <p className="text-[11px] text-accent uppercase tracking-[0.08em] font-medium mb-1">{U.cardEyebrow}</p>
          <p className="font-display text-[18px] text-ink leading-[1.2]">{BOOK.title}</p>
          <p className="text-[13px] text-ink-2 leading-[1.4] mt-0.5">{BOOK.subtitle}</p>
        </div>
      </div>
      <div className="mt-4 pt-1 border-t border-[var(--color-border)]">
        {line && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-[14px] text-ink-2">{line}</span>
            <Link
              to="/buch#buch-status"
              state={{ from: 'profile' }}
              className="min-h-[44px] flex items-center text-[14px] text-accent font-medium hover:underline"
            >
              {U.changeLink}
            </Link>
          </div>
        )}
        <Link
          to="/buch"
          state={{ from: 'profile' }}
          className="min-h-[44px] inline-flex items-center text-[14px] text-accent font-medium hover:underline"
        >
          {U.moreLink}
        </Link>
      </div>
    </div>
  )
}
