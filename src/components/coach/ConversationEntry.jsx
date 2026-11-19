import { ChevronRight } from 'lucide-react'
import { ProfileButton } from '../layout/ProfileButton'

// Gesprächseinstieg (UX-Konzept 4.2a, U3): ersetzt die automatische Wiederkehr-Begrüßung.
// Der Mensch wählt selbst: an einem früheren Gespräch weitermachen oder etwas Neues mitbringen.
// recent: [{ id, title, lastActivityAt, hasOpenThread, moving }] aus pre-session-briefing (ohne Inhalte).

export function relativeLabel(iso) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000))
  if (days === 0) return 'heute'
  if (days === 1) return 'gestern'
  if (days < 7) return `vor ${days} Tagen`
  if (days < 14) return 'letzte Woche'
  return `vor ${Math.floor(days / 7)} Wochen`
}

function conversationLabel(c) {
  if (c.moving) return 'Ein Gespräch, das dich bewegt hat'   // bei hoher Intensität kein Thema
  if (c.title) return c.title
  // Ohne Kurztitel (ältere Gespräche): heute mit Uhrzeit, sonst mit Datum – damit sich Einträge unterscheiden
  const d = new Date(c.lastActivityAt)
  const today = new Date()
  const sameDay = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
  return sameDay
    ? `Gespräch um ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`
    : `Gespräch vom ${d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })}`
}

// trialHint: Übergangstext 1 (U4) – vor dem letzten Kennenlern-Gespräch, einmalig, ohne Button.
// lastStartLabel: 'dritte' bei der Standardgrenze 3, sonst 'letzte'.
export function ConversationEntry({ recent = [], busy = false, onResume, onNew, onWellness, onAll, trialHint = false, lastStartLabel = 'letzte' }) {
  return (
    <div className="px-5 pt-12 pb-24">
      <div className="flex items-start justify-between gap-3 mb-8">
        <div className="min-w-0">
          <h1 className="font-display text-[24px] text-ink">Dein Begleiter</h1>
          <p className="text-[14px] text-ink-2 mt-1">Schön, dass du da bist.</p>
        </div>
        <ProfileButton />
      </div>

      {recent.length > 0 && (
        <section className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.06em] font-medium text-ink-3 mb-3">Weitermachen</p>
          <div className="flex flex-col gap-3">
            {recent.map(c => (
              <button
                key={c.id}
                disabled={busy}
                onClick={() => onResume(c.id)}
                className="w-full text-left bg-surface border border-[var(--color-border)] rounded-xl p-4 shadow-sm hover:shadow transition-all flex items-start gap-3 disabled:opacity-60"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-ink">{conversationLabel(c)}</p>
                  <p className="text-[12px] text-ink-3 mt-1">
                    {relativeLabel(c.lastActivityAt)}
                    {c.hasOpenThread && !c.moving ? ' · da war noch etwas offen' : ''}
                  </p>
                </div>
                <ChevronRight size={16} color="var(--color-ink-3)" className="flex-none mt-1" />
              </button>
            ))}
          </div>
        </section>
      )}

      <button onClick={onAll} className="text-[13px] text-accent font-medium hover:underline mb-8 block">
        Alle Gespräche →
      </button>

      {trialHint && (
        <p className="text-[13px] text-ink-2 leading-relaxed bg-surface-2 rounded-xl px-4 py-3 mb-4">
          Das ist dein {lastStartLabel}s Gespräch zum Kennenlernen. Danach bleibt alles, was du hier erkannt hast, für dich sichtbar. Für neue Gespräche gibt es die Begleitung.
        </p>
      )}

      <button
        disabled={busy}
        onClick={onNew}
        className="w-full bg-accent text-white text-[15px] font-medium py-4 rounded-full hover:bg-accent-2 transition-colors disabled:opacity-60"
      >
        Etwas Neues mitbringen
      </button>
      <button onClick={onWellness} className="w-full text-center text-[13px] text-ink-2 mt-4 hover:underline">
        Erst mal ankommen → Wie geht's dir?
      </button>
    </div>
  )
}
