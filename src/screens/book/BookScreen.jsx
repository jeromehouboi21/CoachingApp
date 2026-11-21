// T1 Buch-Seite (Handoff 4.6): /buch, hinter Login, in der AppShell ohne aktiven Tab.
// Seitentext wörtlich aus BOOK_PAGE_TEXT (B-7). Amazon-Links ohne Affiliate-Parameter, ohne Pixel.
import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { BOOK, BOOK_PAGE_TEXT as T, BOOK_UI_TEXT as U } from '../../content/book'
import { BookStatusPicker } from '../../components/book/BookStatusPicker'
import { ExampleAvatar } from '../../components/tour/illustrations/MiniTabBar'
import { createLogger } from '../../lib/logger'

const logger = createLogger('BookScreen')
const FROM_VALUES = ['profile', 'howto', 'today', 'mirror']

export function BookScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const loggedRef = useRef(false)

  // Einmal protokollieren, woher der Aufruf kam (StrictMode ruft Effekte doppelt auf)
  useEffect(() => {
    if (loggedRef.current) return
    loggedRef.current = true
    const from = FROM_VALUES.includes(location.state?.from) ? location.state.from : 'direct'
    logger.info('book_page_viewed', { from })
  }, [location.state])

  // Sprung zum Status-Abschnitt (Profil „ändern ›“)
  useEffect(() => {
    if (location.hash !== '#buch-status') return
    const el = document.getElementById('buch-status')
    if (!el) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    el.focus({ preventScroll: true })
  }, [location.hash])

  // Zurück innerhalb der App, sonst ins Profil (Einstieg per Link oder neuem Tab)
  const back = () => (location.key !== 'default' ? navigate(-1) : navigate('/profile'))

  const clickLink = (format) => logger.info('book_link_clicked', { format })

  return (
    <div className="px-5 pt-12 pb-10">
      <div className="flex items-center gap-2 mb-6 -ml-2">
        <button
          type="button"
          onClick={back}
          aria-label="Zurück"
          className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface-2 transition-colors"
        >
          <ArrowLeft size={20} color="var(--color-ink)" />
        </button>
        <h1 className="text-[13px] text-ink-3 uppercase tracking-[0.06em] font-medium">{T.header}</h1>
      </div>

      <div className="flex justify-center mb-6">
        <img
          src={BOOK.coverSrc}
          width={BOOK.coverWidth}
          height={BOOK.coverHeight}
          alt={BOOK.coverAlt}
          loading="eager"
          decoding="async"
          className="w-full max-w-[220px] h-auto rounded-[4px] shadow-[0_6px_20px_rgba(26,25,22,0.18)]"
        />
      </div>

      <h2 className="font-display text-[28px] text-ink leading-[1.15] text-center">{BOOK.title}</h2>
      <p className="font-display italic text-[17px] text-ink-2 text-center mt-1 mb-6">{BOOK.subtitle}</p>

      <p className="text-[15px] text-ink-2 leading-[1.7] mb-8">{T.blurb}</p>

      <h2 className="text-[11px] text-accent uppercase tracking-[0.08em] font-medium mb-3">{T.appHeading}</h2>
      <p className="text-[15px] text-ink-2 leading-[1.7] mb-5">{T.appText}</p>

      <blockquote className="border-l-2 border-accent pl-4 mb-5">
        <p className="font-display text-[18px] text-ink leading-[1.4]">{T.quote}</p>
        <cite className="block not-italic text-[13px] text-ink-3 mt-1">{T.quoteSource}</cite>
      </blockquote>

      <p className="text-[15px] text-ink-2 leading-[1.7] mb-8">
        {T.closing[0]}<br />{T.closing[1]}
      </p>

      <div className="flex flex-col gap-3 mb-2">
        <a
          href={BOOK.ebookUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => clickLink('ebook')}
          className="w-full min-h-[48px] flex items-center justify-center bg-accent text-white text-[15px] font-medium rounded-full hover:bg-accent-2 transition-colors"
        >
          {T.ebookButton}
        </a>
        {BOOK.paperbackUrl ? (
          <a
            href={BOOK.paperbackUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => clickLink('paperback')}
            className="w-full min-h-[48px] flex items-center justify-center border border-accent text-accent text-[15px] font-medium rounded-full hover:bg-accent-light transition-colors"
          >
            {T.paperbackButton}
          </a>
        ) : (
          <p className="w-full min-h-[48px] flex items-center justify-center border border-[var(--color-border)] text-ink-2 text-[15px] rounded-full">
            {T.paperbackPending.replace('{datum}', BOOK.paperbackReleaseLabel)}
          </p>
        )}
      </div>
      <p className="text-[12px] text-ink-3 text-center mb-10">{U.linksNote}</p>

      <BookStatusPicker />

      <div className="flex items-center gap-3 mt-10 pt-6 border-t border-[var(--color-border)]">
        <ExampleAvatar size={32} />
        <p className="text-[13px] text-ink-2">{T.footer}</p>
      </div>
    </div>
  )
}
