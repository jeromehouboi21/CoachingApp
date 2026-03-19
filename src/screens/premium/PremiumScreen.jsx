import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'

const FEATURES_FREE = [
  '3 KI-Coach Gespräche pro Monat',
  'Skalierungsfragen unbegrenzt',
  'Home-Screen & Impulsfragen',
  'Spracheingabe',
  'Bis zu 10 Erkenntnisse im Spiegel',
]

const FEATURES_PREMIUM = [
  'Unbegrenzte KI-Coach Gespräche',
  'Vollständiges Coach-Gedächtnis',
  'Mein Spiegel: unbegrenzte Erkenntnisse',
  'Gesprächsverlauf & Zusammenfassungen',
  'Innere Stimmen Modul (demnächst)',
  'Direkter Kontakt zu Jerome',
]

export function PremiumScreen() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-bg flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-12 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-2 transition-colors"
        >
          <ArrowLeft size={20} color="var(--color-ink)" />
        </button>
        <span className="text-[13px] text-ink-3 uppercase tracking-[0.06em] font-medium">
          Plan & Abonnement
        </span>
      </div>

      <div className="flex-1 px-5 pb-8">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="font-display text-[28px] text-ink leading-[1.25] mb-2">
            Mehr Raum für<br />deine Entwicklung.
          </h1>
          <p className="text-[15px] text-ink-2">
            Premium gibt dir unbegrenzten Zugang — damit kein wichtiges Gespräch an einem Kontingent scheitert.
          </p>
        </div>

        {/* Free Plan */}
        <div className="bg-surface border border-[var(--color-border)] rounded-xl p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[17px] font-medium text-ink">Kostenlos</p>
            <span className="bg-accent-light text-accent text-[11px] font-medium px-3 py-1 rounded-full">Dein aktueller Plan</span>
          </div>
          <ul className="flex flex-col gap-2">
            {FEATURES_FREE.map(f => (
              <li key={f} className="flex items-start gap-2 text-[14px] text-ink-2">
                <Check size={15} color="var(--color-ink-3)" className="mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Premium Plan */}
        <div className="bg-accent rounded-xl p-5 mb-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-white/5 rounded-full translate-x-6 -translate-y-6" />
          <div className="flex items-center justify-between mb-1">
            <p className="text-[17px] font-medium text-white">Premium</p>
            <span className="bg-white/20 text-white text-[11px] font-medium px-3 py-1 rounded-full">Demnächst</span>
          </div>
          <p className="text-[13px] text-white/70 mb-4">Preis wird bald bekannt gegeben.</p>
          <ul className="flex flex-col gap-2 mb-5">
            {FEATURES_PREMIUM.map(f => (
              <li key={f} className="flex items-start gap-2 text-[14px] text-white/90">
                <Check size={15} color="rgba(255,255,255,0.7)" className="mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <p className="text-[13px] text-white/70">
            Bis Premium verfügbar ist, kannst du persönlich mit Jerome arbeiten.
          </p>
        </div>

        {/* Jerome CTA */}
        <div className="bg-surface border border-[var(--color-border)] rounded-xl p-5">
          <p className="text-[11px] text-ink-3 uppercase tracking-[0.06em] mb-2">Alternative</p>
          <h2 className="font-display text-[20px] text-ink leading-[1.3] mb-2">
            Persönliches Coaching mit Jerome
          </h2>
          <p className="text-[13px] text-ink-2 mb-4">
            Zertifizierter Systemischer Coach · Paracelsus · 160 Unterrichtsstunden.
          </p>
          <a
            href="https://www.friedensstifter.coach/contact/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-accent text-white text-[13px] font-medium px-5 py-2.5 rounded-full hover:bg-accent-2 transition-colors"
          >
            Termin buchen →
          </a>
        </div>
      </div>
    </div>
  )
}
