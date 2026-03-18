import { useNavigate } from 'react-router-dom'
import { Lock, CheckCircle } from 'lucide-react'
import { Button } from '../../components/ui/Button'

export function LandingScreen() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-bg flex flex-col max-w-lg mx-auto">
      <div className="flex-1 px-6 pt-10 pb-32 overflow-y-auto">

        {/* Header */}
        <div className="mb-10">
          <span className="font-display text-[28px] text-accent">Friedensstifter</span>
        </div>

        {/* Hero */}
        <div className="mb-8">
          <h1 className="font-display text-[32px] text-ink leading-[1.2] mb-3">
            Ein Gespräch, das dir hilft, klarer zu sehen.
          </h1>
          <p className="text-[16px] text-ink-2 leading-relaxed">
            Du bringst dein Thema.<br />
            Die App stellt die richtigen Fragen.<br />
            Du findest deine Antworten.
          </p>
        </div>

        {/* Vertrauens-Block */}
        <div className="bg-accent-light rounded-lg p-5 mb-8 flex gap-3">
          <Lock size={20} color="var(--color-accent)" className="flex-none mt-0.5" />
          <p className="text-[14px] text-ink-2 leading-[1.6]">
            Was du hier teilst, gehört nur dir. Keine Weitergabe an Dritte. Keine Werbung. Kein Training von KI-Modellen mit deinen Daten.
          </p>
        </div>

        {/* Was dich erwartet */}
        <div className="mb-8">
          <div className="flex flex-col gap-3">
            {[
              'Ein KI-Coach, der zuhört und Fragen stellt — nie Ratschläge gibt',
              'Ein persönlicher Spiegel: Was du über dich lernst, bleibt bei dir',
              'Entwickelt von Jerome Houboi, zertifiziertem Systemischen Coach',
            ].map((text, i) => (
              <div key={i} className="flex gap-3 items-start">
                <CheckCircle size={18} color="var(--color-accent)" className="flex-none mt-0.5" />
                <p className="text-[14px] text-ink-2 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Jerome-Zeile */}
        <div className="flex items-center gap-3 pb-2">
          <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center flex-none">
            <span className="font-display text-white text-[16px]">J</span>
          </div>
          <div>
            <p className="text-[13px] text-ink font-medium">Jerome Houboi</p>
            <p className="text-[12px] text-ink-3">Systemischer Coach · Paracelsus · 160 Ustd.</p>
          </div>
        </div>
        <a
          href="https://www.friedensstifter.coach"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13px] text-accent ml-[52px] hover:underline"
        >
          Mehr erfahren → friedensstifter.coach
        </a>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto px-6 pb-8 pt-4 bg-gradient-to-t from-bg via-bg to-transparent">
        <Button variant="primary" className="w-full py-4 text-base" onClick={() => navigate('/auth')}>
          Kostenlos starten
        </Button>
        <button
          onClick={() => navigate('/auth?mode=login')}
          className="w-full text-[13px] text-ink-3 text-center mt-3 hover:text-ink-2 transition-colors"
        >
          Bereits registriert? Anmelden
        </button>
      </div>
    </div>
  )
}
