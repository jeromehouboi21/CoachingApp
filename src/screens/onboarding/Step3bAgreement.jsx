import { useState } from 'react'
import { CoachingAgreementContent } from '../../components/legal/CoachingAgreementContent'

const StepDots = ({ current, total }) => (
  <div className="flex gap-2">
    {Array.from({ length: total }).map((_, i) => (
      <span key={i} className={`w-2 h-2 rounded-full transition-all ${i + 1 === current ? 'bg-accent w-4' : 'bg-ink-3'}`} />
    ))}
  </div>
)

export function Step3bAgreement({ onNext, current = 4, total = 5 }) {
  const [agreed, setAgreed] = useState(false)

  return (
    <div className="flex flex-col min-h-screen px-6 py-10 animate-[fadeSlideUp_0.4s_ease]">
      <div className="flex items-center justify-between mb-10">
        <span className="font-display text-[28px] text-ink">Friedensstifter</span>
        <StepDots current={current} total={total} />
      </div>

      <div className="mb-6">
        <h1 className="font-display text-[24px] text-ink mb-2">Bevor wir anfangen</h1>
        <p className="text-[14px] text-ink-2 leading-relaxed">
          Kurz und ehrlich — damit du weißt, worauf du dich einlässt.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <CoachingAgreementContent />

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
          <p className="text-[11px] text-ink-3 mt-2 pl-7">
            Du kannst diese Vereinbarung jederzeit in deinem Profil erneut aufrufen —
            inklusive dem Datum deiner Zustimmung.
          </p>
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
