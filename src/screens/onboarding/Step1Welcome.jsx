import { Button } from '../../components/ui/Button'

const StepDots = ({ current, total }) => (
  <div className="flex gap-2">
    {Array.from({ length: total }).map((_, i) => (
      <span
        key={i}
        className={`w-2 h-2 rounded-full transition-all ${i + 1 === current ? 'bg-accent w-4' : 'bg-ink-3'}`}
      />
    ))}
  </div>
)

export function Step1Welcome({ onNext, onSkip }) {
  return (
    <div className="flex flex-col min-h-screen px-6 py-10 animate-[fadeSlideUp_0.4s_ease]">
      <div className="flex items-center justify-between mb-12">
        <span className="font-display text-[28px] text-ink">Friedensstifter</span>
        <StepDots current={1} total={4} />
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <h1 className="font-display text-[32px] text-ink leading-[1.2] mb-4">
          Gibt es etwas, das dich gerade beschäftigt?
        </h1>
        <p className="text-[16px] text-ink-2 leading-relaxed">
          Kein Problem. Kein Thema. Manchmal ist es nur ein Gefühl — ein leises Unbehagen, das du noch nicht in Worte fassen kannst.
        </p>
      </div>

      <div className="flex flex-col gap-3 pb-8">
        <Button variant="primary" className="w-full text-base py-4" onClick={onNext}>
          Ja, da ist etwas
        </Button>
        <button
          onClick={onSkip}
          className="text-[14px] text-ink-3 text-center hover:text-ink-2 transition-colors py-2"
        >
          Ich schaue mich erst mal um →
        </button>
      </div>
    </div>
  )
}
