// Einstiegs-Rundgang (Paket R, Handoff 4.3): fünf Schritte als Vollbild-Overlay.
// mode 'auto'  (Heute):  Haken „Nicht mehr anzeigen“, „Überspringen“, letzter Knopf „Los geht's“
// mode 'manual' (Profil, „Wie es funktioniert“): kein Haken, „Schließen“, letzter Knopf „Fertig“
// Keine echten Nutzerdaten, Texte aus src/content/welcomeTour.js. Logs nur als tour_*-Codes.
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ArrowRight, Sparkles, Lock, Activity, MessageCircle, Quote, Repeat, TrendingUp } from 'lucide-react'
import { TOUR_STEPS, kennenlernenText } from '../../content/welcomeTour'
import { createLogger } from '../../lib/logger'
import { WelcomeIllustration } from './illustrations/WelcomeIllustration'
import { TodayIllustration } from './illustrations/TodayIllustration'
import { ConversationIllustration } from './illustrations/ConversationIllustration'
import { MirrorIllustration } from './illustrations/MirrorIllustration'
import { CycleIllustration } from './illustrations/CycleIllustration'
import { ExampleAvatar } from './illustrations/MiniTabBar'

const logger = createLogger('WelcomeTour')

const BULLET_ICONS = { sparkle: Sparkles, lock: Lock, pulse: Activity, message: MessageCircle, quote: Quote, repeat: Repeat, trend: TrendingUp }

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'

function Illustration({ step }) {
  switch (step.id) {
    case 'willkommen': return <WelcomeIllustration caption={step.illustrationCaption} />
    case 'heute':      return <TodayIllustration />
    case 'gespraech':  return <ConversationIllustration />
    case 'spiegel':    return <MirrorIllustration />
    case 'kreislauf':  return <CycleIllustration caption={step.illustrationCaption} />
    default:           return null
  }
}

/**
 * @param {object} p
 * @param {'auto'|'manual'} p.mode
 * @param {(r: { dismiss: boolean }) => void} p.onClose
 * @param {number|null} [p.kennenlernenLimit]  access.starts_limit, nur bei Phase kennenlernen (R-3), sonst null
 */
export function WelcomeTour({ mode, onClose, kennenlernenLimit = null }) {
  const [index, setIndex] = useState(0)
  const [checked, setChecked] = useState(false)   // ein Zustand für den ganzen Rundgang
  const panelRef = useRef(null)
  const headingRef = useRef(null)
  const closedRef = useRef(false)
  const loggedRef = useRef(false)
  const titleId = useId()
  const isAuto = mode === 'auto'
  const step = TOUR_STEPS[index]
  const isLast = index === TOUR_STEPS.length - 1
  const note = isLast ? kennenlernenText(kennenlernenLimit) : null

  const finish = (how) => {
    if (closedRef.current) return
    closedRef.current = true
    if (how === 'complete') logger.info('tour_completed', { mode })
    else logger.info('tour_skipped', { mode, step: index + 1 })
    onClose({ dismiss: isAuto && checked })
  }
  // aktueller Stand für den Tasten-Handler (ohne ihn bei jedem Schritt neu anzumelden)
  const finishRef = useRef(finish)
  finishRef.current = finish

  // Einmal protokollieren (StrictMode ruft Effekte doppelt auf)
  useEffect(() => {
    if (loggedRef.current) return
    loggedRef.current = true
    logger.info('tour_shown', { mode })
  }, [mode])

  // Körper-Scroll sperren, Fokus merken und zurückgeben
  useEffect(() => {
    const previous = document.activeElement
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
      if (previous && typeof previous.focus === 'function') previous.focus()
    }
  }, [])

  // Beim Schrittwechsel Fokus auf die Überschrift
  useEffect(() => {
    headingRef.current?.focus()
  }, [index])

  // Esc schließt, Tab bleibt im Overlay (Fokusfalle)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        finishRef.current('skip')
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const items = [...panelRef.current.querySelectorAll(FOCUSABLE)]
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      const inside = panelRef.current.contains(active)
      if (e.shiftKey && (active === first || !inside || active === headingRef.current)) {
        e.preventDefault(); last.focus()
      } else if (!e.shiftKey && (active === last || !inside)) {
        e.preventDefault(); first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const next = () => (isLast ? finish('complete') : setIndex(i => i + 1))
  const back = () => setIndex(i => Math.max(0, i - 1))

  return createPortal(
    <div
      className="fixed inset-0 z-[70] bg-bg flex justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        ref={panelRef}
        className="w-full max-w-lg h-full flex flex-col"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        {/* Kopfzeile: Zurück · Punkte · Überspringen */}
        <div className="h-[60px] shrink-0 px-2 pt-2 flex items-center justify-between">
          {index > 0 ? (
            <button type="button" onClick={back} aria-label="Zurück" className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface-2">
              <ChevronLeft size={22} strokeWidth={1.8} color="var(--color-ink)" />
            </button>
          ) : <span className="w-11 h-11" />}

          <div role="img" aria-label={`Schritt ${index + 1} von ${TOUR_STEPS.length}`} className="flex gap-1.5 items-center">
            {TOUR_STEPS.map((s, i) => (
              <span
                key={s.id}
                className={`h-1.5 rounded-full ${i === index ? 'w-5 bg-accent' : 'w-1.5 bg-[rgba(26,25,22,0.22)]'}`}
              />
            ))}
          </div>

          {!isLast ? (
            <button type="button" onClick={() => finish('skip')} className="min-h-[44px] px-3 text-[14px] text-ink-2 hover:text-ink">
              {isAuto ? 'Überspringen' : 'Schließen'}
            </button>
          ) : <span className="w-[92px]" />}
        </div>

        {/* Inhalt: scrollt auf kleinen Displays innerhalb des Overlays */}
        <div className="flex-1 overflow-y-auto">
          <div key={step.id} className="motion-safe:animate-[fadeIn_150ms_ease]">
            <div aria-hidden="true" className="mx-5 mt-1.5 h-[300px] rounded-[20px] bg-accent-light p-[18px] flex flex-col overflow-hidden">
              <Illustration step={step} />
            </div>

            <div className="px-7 pt-[26px] pb-5 flex flex-col gap-3.5">
              <p className="text-[12px] tracking-[0.08em] uppercase text-ink-2 font-medium">{step.eyebrow}</p>
              <h1
                id={titleId}
                ref={headingRef}
                tabIndex={-1}
                className="font-display font-normal text-[30px] leading-[1.15] text-ink outline-none"
              >
                {step.title}<em className="text-accent">{step.titleEmphasis}</em>
              </h1>

              {step.body.map((p, i) => (
                <p key={i} className="text-[16px] leading-[1.55] text-ink-2">{p}</p>
              ))}

              {step.bullets.length > 0 && (
                <ul className="flex flex-col gap-3 mt-0.5">
                  {step.bullets.map((b, i) => {
                    const Icon = BULLET_ICONS[b.icon] ?? Sparkles
                    return (
                      <li key={i} className={`flex gap-3 ${b.label ? 'items-center' : 'items-start'}`}>
                        <span className="w-8 h-8 rounded-full bg-accent-light flex items-center justify-center shrink-0" aria-hidden="true">
                          <Icon size={16} strokeWidth={1.8} color="var(--color-accent)" />
                        </span>
                        <p className={`text-[15px] text-ink-2 ${b.label ? 'leading-[1.4]' : 'pt-[5px] leading-[1.5]'}`}>
                          {b.label && <><span className="text-ink font-medium">{b.label}</span> – </>}
                          {b.text}
                        </p>
                      </li>
                    )
                  })}
                </ul>
              )}

              {step.footnote && (
                <p className="mt-1 text-[14px] leading-[1.5] text-ink-2">{step.footnote}</p>
              )}

              {step.profileNote && (
                <div className="flex gap-3 items-center bg-surface border border-[var(--color-border)] rounded-2xl px-3.5 py-3">
                  <span aria-hidden="true"><ExampleAvatar size={32} /></span>
                  <p className="text-[14px] leading-[1.45] text-ink-2">{step.profileNote}</p>
                </div>
              )}

              {note && <p className="text-[14px] leading-[1.5] text-ink-2">{note}</p>}
            </div>
          </div>
        </div>

        {/* Fußzeile: Haken (nur auto) · Weiter */}
        <div
          className="shrink-0 px-5 pt-3.5 flex items-center justify-between gap-3 border-t border-[var(--color-border)]"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 26px)' }}
        >
          {isAuto ? (
            <label className="flex items-center gap-2.5 min-h-[44px] text-[14px] text-ink-2 cursor-pointer">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="w-5 h-5 m-0 accent-[var(--color-accent)]"
              />
              Nicht mehr anzeigen
            </label>
          ) : <span />}

          <button
            type="button"
            onClick={next}
            className="flex items-center gap-2 min-h-[44px] px-[22px] rounded-full bg-accent text-white text-[15px] font-medium hover:bg-accent-2 transition-colors"
          >
            {isLast ? (isAuto ? 'Los geht’s' : 'Fertig') : <>Weiter<ArrowRight size={16} strokeWidth={2} aria-hidden="true" /></>}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
