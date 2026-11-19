// „Wie wir deine Daten schützen“ (Paket K, W2; Konzept 4.2). Route /sicherheit, öffentlich, ohne Datenbankaufrufe.
// Zeigt nur Einträge mit status 'live' aus src/content/securityMeasures.js – ruhige Liste,
// keine Häkchen, keine Wertungsfarben. SecurityInfoSheet: gleiche Inhalte im Sheet (Einstieg, W3).
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, X } from 'lucide-react'
import { SECURITY_PAGE_AS_OF, SECURITY_GROUPS, SECURITY_MEASURES, SECURITY_HONESTY } from '../../content/securityMeasures'

function asOfLabel(ym) {
  const [y, m] = String(ym).split('-').map(Number)
  const d = new Date(y, (m || 1) - 1, 1)
  return Number.isNaN(d.getTime()) ? ym : d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
}

export function SecurityInfoContent({ onNavigate }) {
  const honesty = SECURITY_HONESTY.filter(h => h.status === 'live')
  return (
    <div>
      <h1 className="font-display text-[26px] text-ink leading-[1.25] mb-1">Wie wir deine Daten schützen</h1>
      <p className="text-[12px] text-ink-3 mb-5">Stand: {asOfLabel(SECURITY_PAGE_AS_OF)}</p>
      <p className="text-[15px] text-ink-2 leading-relaxed">
        Du teilst hier sehr Persönliches. Deshalb ist Sicherheit für mich kein Zusatz, sondern Grundlage. Hier steht, was ich dafür tue und wo die Grenzen liegen.
      </p>
      <p className="text-[13px] text-ink-3 mt-1 mb-8">– Jerome</p>

      {SECURITY_GROUPS.map(g => {
        const items = SECURITY_MEASURES.filter(m => m.group === g.key && m.status === 'live')
        if (!items.length) return null
        return (
          <section key={g.key} className="mb-7">
            <h2 className="text-[15px] font-medium text-ink mb-3">{g.title}</h2>
            <ul className="flex flex-col gap-3">
              {items.map(m => (
                <li key={m.id} className="flex gap-3 text-[14px] text-ink-2 leading-relaxed">
                  <span className="text-ink-3 flex-none" aria-hidden="true">·</span>
                  <span>{m.text}</span>
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      {honesty.length > 0 && (
        <section className="bg-surface-2 rounded-xl p-4 mb-8">
          <h2 className="text-[15px] font-medium text-ink mb-3">Was du wissen solltest</h2>
          <ul className="flex flex-col gap-3">
            {honesty.map((h, i) => (
              <li key={i} className="text-[14px] text-ink-2 leading-relaxed">{h.text}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex gap-5 text-[13px]">
        <button onClick={() => onNavigate('/datenschutz')} className="text-ink-3 hover:text-ink-2 hover:underline">Datenschutzerklärung</button>
        <button onClick={() => onNavigate('/impressum')} className="text-ink-3 hover:text-ink-2 hover:underline">Impressum</button>
      </div>
    </div>
  )
}

export function SecurityInfoScreen() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-lg mx-auto px-5 pt-12 pb-16">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-ink-3 text-[13px] mb-6">
          <ChevronLeft size={16} />
          Zurück
        </button>
        <SecurityInfoContent onNavigate={(to) => navigate(to)} />
      </div>
    </div>
  )
}

/** Sheet-Variante (Einstieg, W3). */
export function SecurityInfoSheet({ onClose }) {
  const navigate = useNavigate()
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Wie wir deine Daten schützen">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-bg w-full max-w-lg rounded-t-2xl max-h-[90vh] overflow-y-auto p-6 pb-10">
        <button onClick={onClose} aria-label="Schließen" className="absolute right-4 top-4 p-1 text-ink-3 hover:text-ink-2">
          <X size={18} />
        </button>
        <SecurityInfoContent onNavigate={(to) => { onClose(); navigate(to) }} />
      </div>
    </div>,
    document.body,
  )
}
