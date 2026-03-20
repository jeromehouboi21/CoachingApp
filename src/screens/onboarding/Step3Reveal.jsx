import { Button } from '../../components/ui/Button'

const StepDots = ({ current, total }) => (
  <div className="flex gap-2">
    {Array.from({ length: total }).map((_, i) => (
      <span key={i} className={`w-2 h-2 rounded-full transition-all ${i + 1 === current ? 'bg-accent w-4' : 'bg-ink-3'}`} />
    ))}
  </div>
)

const KreislaufSVG = () => (
  <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Drei Knoten auf einem Kreis */}
    {/* Oben: Situation (ca. 90° = oben) */}
    <circle cx="100" cy="30" r="26" fill="var(--color-accent-light)" stroke="var(--color-accent)" strokeWidth="1.5" />
    <text x="100" y="34" textAnchor="middle" fontSize="11" fill="var(--color-accent)" fontFamily="DM Sans, sans-serif" fontWeight="500">Situation</text>

    {/* Unten rechts: Reaktion */}
    <circle cx="162" cy="148" r="26" fill="var(--color-accent-light)" stroke="var(--color-accent)" strokeWidth="1.5" />
    <text x="162" y="152" textAnchor="middle" fontSize="11" fill="var(--color-accent)" fontFamily="DM Sans, sans-serif" fontWeight="500">Reaktion</text>

    {/* Unten links: Ergebnis */}
    <circle cx="38" cy="148" r="26" fill="var(--color-accent-light)" stroke="var(--color-accent)" strokeWidth="1.5" />
    <text x="38" y="152" textAnchor="middle" fontSize="11" fill="var(--color-accent)" fontFamily="DM Sans, sans-serif" fontWeight="500">Ergebnis</text>

    {/* Pfeile zwischen den Knoten */}
    {/* Situation → Reaktion */}
    <path d="M118 46 L148 128" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" markerEnd="url(#arrow)" />
    {/* Reaktion → Ergebnis */}
    <path d="M136 152 L64 152" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" markerEnd="url(#arrow)" />
    {/* Ergebnis → Situation */}
    <path d="M52 128 L82 46" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" markerEnd="url(#arrow)" />

    <defs>
      <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
        <path d="M0,0 L0,6 L8,3 z" fill="var(--color-accent)" />
      </marker>
    </defs>
  </svg>
)

export function Step3Reveal({ onNext, onSkip }) {
  return (
    <div className="flex flex-col min-h-screen px-6 py-10 animate-[fadeSlideUp_0.4s_ease]">
      <div className="flex items-center justify-between mb-10">
        <span className="font-display text-[28px] text-ink">Friedensstifter</span>
        <StepDots current={3} total={4} />
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <div className="flex justify-center mb-8">
          <KreislaufSVG />
        </div>

        <h1 className="font-display text-[22px] text-ink leading-[1.25] mb-4 text-center">
          Solche Muster haben immer einen Grund.
        </h1>

        <p className="text-[15px] text-ink-2 leading-[1.65] text-center">
          Nicht weil du falsch bist — sondern weil dieses Verhalten
          irgendwann die beste Lösung war, die du hattest.
        </p>

        <p className="text-[15px] text-ink-2 leading-[1.65] mt-4 text-center">
          Es gibt Fragen, die helfen zu verstehen, warum dieses Muster
          entstanden ist. Und was du heute damit machen kannst.
        </p>

        <p className="text-[15px] text-ink-2 leading-[1.65] mt-4 text-center">
          Nicht durch Analyse. Nicht durch Ratschläge.
          Sondern indem du lernst, das Muster zu sehen —
          bevor es dich steuert.
        </p>
      </div>

      <div className="pb-8 pt-6 flex flex-col gap-3">
        <Button variant="primary" className="w-full text-base py-4" onClick={onNext}>
          Ich möchte das verstehen
        </Button>
        <button
          onClick={onSkip}
          className="text-[13px] text-ink-3 text-center hover:text-ink-2 transition-colors py-2"
        >
          Ich schaue mich erst mal um
        </button>
      </div>
    </div>
  )
}
