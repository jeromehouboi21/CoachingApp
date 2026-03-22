import { useState } from 'react'
import { Avatar } from '../../components/ui/Avatar'

const StepDots = ({ current, total }) => (
  <div className="flex gap-2">
    {Array.from({ length: total }).map((_, i) => (
      <span key={i} className={`w-2 h-2 rounded-full transition-all ${i + 1 === current ? 'bg-accent w-4' : 'bg-ink-3'}`} />
    ))}
  </div>
)

export function Step3bAgreement({ onNext }) {
  const [agreed, setAgreed] = useState(false)

  return (
    <div className="flex flex-col min-h-screen px-6 py-10 animate-[fadeSlideUp_0.4s_ease]">
      <div className="flex items-center justify-between mb-10">
        <span className="font-display text-[28px] text-ink">Friedensstifter</span>
        <StepDots current={4} total={5} />
      </div>

      <div className="mb-6">
        <h1 className="font-display text-[24px] text-ink mb-2">Bevor wir anfangen</h1>
        <p className="text-[14px] text-ink-2 leading-relaxed">
          Kurz und ehrlich — damit du weißt, worauf du dich einlässt.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-6 text-[14px] text-ink-2 leading-[1.7]">

          <section>
            <p className="text-[13px] text-ink-3 uppercase tracking-[0.05em] font-medium mb-2">Was du hier nutzt</p>
            <p>
              Der Coaching-Begleiter dieser App wurde von mir — Jerome Houboi,
              zertifizierter systemischer Coach — entwickelt und wird von mir
              verantwortet. Die Antworten generiert eine KI auf Basis der
              Prinzipien systemischen Coachings. Ich bin der Mensch hinter
              diesem Angebot.
            </p>
          </section>

          <section>
            <p className="text-[13px] text-ink-3 uppercase tracking-[0.05em] font-medium mb-2">Was das bedeutet für deine Daten</p>
            <p className="mb-3">
              Als Betreiber dieser App habe ich technischen Zugang zu den
              Inhalten deiner Gespräche — so wie ein Coach, der dein Gespräch
              führt, deine Themen kennt. Ich verpflichte mich, diese Inhalte
              vertraulich zu behandeln. Das bedeutet konkret:
            </p>
            <ul className="flex flex-col gap-1.5 pl-1">
              {[
                'Ich lese deine Gespräche nicht — außer bei einem technischen Problem, das meine direkte Intervention erfordert.',
                'Ich gebe deine Inhalte niemals an Dritte weiter.',
                'Ich nutze deine Inhalte nicht für Werbung, Analyse oder andere Zwecke.',
                'Diese Vertraulichkeit gilt auch nach Beendigung der Nutzung.',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-accent mt-0.5 flex-shrink-0">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <p className="text-[13px] text-ink-3 uppercase tracking-[0.05em] font-medium mb-2">Was dieser Begleiter nicht ist</p>
            <p>
              Dieser Coaching-Begleiter ersetzt keine Psychotherapie, keine
              psychiatrische Behandlung und keine medizinische Beratung.
              Bei ernsthaften psychischen Beschwerden wende dich bitte
              an eine Fachkraft.
            </p>
          </section>

          <section>
            <p className="text-[13px] text-ink-3 uppercase tracking-[0.05em] font-medium mb-2">Deine Rechte</p>
            <p>
              Du kannst dein Konto und alle deine Daten jederzeit löschen.
              Diese Vereinbarung kann von dir jederzeit durch Löschung
              des Kontos beendet werden.
            </p>
          </section>
        </div>

        {/* Jerome-Signatur */}
        <div className="flex items-center gap-3 mt-8 pt-6 border-t border-[var(--color-border)]">
          <Avatar name="Jerome Houboi" size="md" />
          <div>
            <p className="text-[14px] font-medium text-ink">Jerome Houboi</p>
            <p className="text-[12px] text-ink-3">Zertifizierter systemischer Coach</p>
          </div>
        </div>

        {/* Einwilligung */}
        <div className="mt-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="mt-0.5 flex-shrink-0 accent-[var(--color-accent)]"
            />
            <span className="text-[13px] text-ink-2 leading-snug">
              Ich habe die Coaching-Vereinbarung gelesen und stimme zu.
            </span>
          </label>
        </div>

        <button
          onClick={onNext}
          disabled={!agreed}
          className="w-full mt-5 mb-8 bg-accent text-white py-4 rounded-full font-medium text-[15px] hover:bg-accent-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Verstanden — weiter
        </button>
      </div>
    </div>
  )
}
