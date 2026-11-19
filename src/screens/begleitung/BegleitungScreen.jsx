// Info-Seite „Begleitung“ (U4, E-U4-7). Noch ohne Bezahlung: endet beim Kontakt zu Jerome.
// Grundsatz (UX 5.2): Was über dich entsteht, gehört dir und bleibt sichtbar. Bezahlt wird für
// neue Gespräche, nicht für den Blick auf die eigenen Daten. Keine Verknappung, kein Druck.
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { useAccessState, COACHING_CONTACT_URL } from '../../lib/accessState'

const ALWAYS = [
  'Heute mit Tagesimpuls und „Wie geht’s dir?“',
  'Dein ganzer Spiegel: Erkenntnisse, Muster und Entwicklung',
  'Alle bisherigen Gespräche zum Nachlesen',
  'Deine Daten als Datei herunterladen',
]

const COMPANION = [
  'Neue Gespräche, so oft du möchtest',
  'Dein Begleiter lernt weiter mit dir: Gedächtnis und Gesprächsstil',
  'Vorrang bei Terminen mit Jerome',
]

const PHASE_TEXT = {
  kennenlernen: 'Du bist gerade im Kennenlernen: drei Gespräche, ohne Zeitlimit.',
  ruhemodus: 'Deine Kennenlern-Gespräche liegen hinter dir. Alles, was du erkannt hast, bleibt für dich sichtbar.',
  begleitung: 'Du bist in der Begleitung.',
}

export function BegleitungScreen() {
  const navigate = useNavigate()
  const { access } = useAccessState()

  return (
    <div className="min-h-screen bg-bg flex flex-col max-w-lg mx-auto">
      <div className="flex items-center gap-3 px-5 pt-12 pb-4">
        <button
          onClick={() => navigate(-1)}
          aria-label="Zurück"
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-2 transition-colors"
        >
          <ArrowLeft size={20} color="var(--color-ink)" />
        </button>
        <span className="text-[13px] text-ink-3 uppercase tracking-[0.06em] font-medium">Begleitung</span>
      </div>

      <div className="flex-1 px-5 pb-10">
        <h1 className="font-display text-[28px] text-ink leading-[1.25] mb-3">
          Was dir gehört,<br />bleibt dir.
        </h1>
        <p className="text-[15px] text-ink-2 leading-relaxed mb-2">
          Gespräche mit deinem Begleiter brauchen Rechenleistung, und die kostet Geld. Deshalb gibt es drei Gespräche zum Kennenlernen und danach die Begleitung.
        </p>
        {access?.phase && (
          <p className="text-[14px] text-ink-3 leading-relaxed mb-6">{PHASE_TEXT[access.phase]}</p>
        )}

        <div className="bg-surface border border-[var(--color-border)] rounded-xl p-5 mb-4">
          <p className="text-[15px] font-medium text-ink mb-3">Bleibt dir, auch ohne Begleitung</p>
          <ul className="flex flex-col gap-2">
            {ALWAYS.map(f => (
              <li key={f} className="flex items-start gap-2 text-[14px] text-ink-2">
                <Check size={15} color="var(--color-ink-3)" className="mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-accent-light rounded-xl p-5 mb-6">
          <p className="text-[15px] font-medium text-ink mb-1">Mit Begleitung</p>
          <p className="text-[13px] text-ink-3 mb-3">Der Preis steht noch nicht fest.</p>
          <ul className="flex flex-col gap-2">
            {COMPANION.map(f => (
              <li key={f} className="flex items-start gap-2 text-[14px] text-ink-2">
                <Check size={15} color="var(--color-accent)" className="mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-surface border border-[var(--color-border)] rounded-xl p-5">
          <p className="text-[14px] text-ink-2 leading-relaxed mb-4">
            Bis die Begleitung startet, schreib mir gern, wenn du weitermachen möchtest. Oder wir sprechen persönlich miteinander.
          </p>
          <a
            href={COACHING_CONTACT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-accent text-white text-[13px] font-medium px-5 py-2.5 rounded-full hover:bg-accent-2 transition-colors"
          >
            Kontakt zu Jerome →
          </a>
          <p className="text-[12px] text-ink-3 mt-4">— Jerome</p>
        </div>
      </div>
    </div>
  )
}
