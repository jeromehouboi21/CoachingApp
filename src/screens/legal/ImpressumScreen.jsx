import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

export function ImpressumScreen() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-bg">
      <div className="px-5 pt-12 pb-24">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-ink-3 text-[13px] mb-6"
        >
          <ChevronLeft size={16} />
          Zurück
        </button>

        <h1 className="font-display text-[24px] text-ink mb-6">Impressum</h1>

        <div className="flex flex-col gap-6 text-[14px] text-ink-2 leading-relaxed">
          <section>
            <p className="text-[11px] text-ink-3 uppercase tracking-[0.06em] font-medium mb-2">Angaben gemäß § 5 TMG</p>
            <p className="text-ink font-medium">Jerome Houboi</p>
            <p>Damer Str. 41</p>
            <p>41372 Niederkrüchten</p>
          </section>

          <section>
            <p className="text-[11px] text-ink-3 uppercase tracking-[0.06em] font-medium mb-2">Kontakt</p>
            <p>Telefon: 01774482782</p>
            <p>E-Mail: jerome@houboi.de</p>
          </section>

          <section>
            <p className="text-[11px] text-ink-3 uppercase tracking-[0.06em] font-medium mb-2">Verantwortlich für den Inhalt</p>
            <p>Jerome Houboi (Anschrift wie oben)</p>
          </section>

          <section>
            <p className="text-[11px] text-ink-3 uppercase tracking-[0.06em] font-medium mb-2">Hinweis</p>
            <p>
              Friedensstifter ist kein Ersatz für professionelle psychologische oder therapeutische Beratung.
              Die App bietet systemisches Coaching-Begleitung und dient der persönlichen Reflexion.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
