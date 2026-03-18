import { Button } from '../../components/ui/Button'

const StepDots = ({ current, total }) => (
  <div className="flex gap-2">
    {Array.from({ length: total }).map((_, i) => (
      <span key={i} className={`w-2 h-2 rounded-full transition-all ${i + 1 === current ? 'bg-accent w-4' : 'bg-ink-3'}`} />
    ))}
  </div>
)

const PatternSVG = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="40" cy="40" r="32" stroke="var(--color-accent)" strokeWidth="2" strokeDasharray="4 4" />
    <circle cx="40" cy="40" r="20" stroke="var(--color-accent)" strokeWidth="2" opacity="0.5" />
    <path d="M40 8 A32 32 0 0 1 72 40" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M68 36 L72 40 L68 44" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
)

export function Step3Reveal({ onNext }) {
  return (
    <div className="flex flex-col min-h-screen px-6 py-10 animate-[fadeSlideUp_0.4s_ease]">
      <div className="flex items-center justify-between mb-10">
        <span className="font-display text-[28px] text-ink">Friedensstifter</span>
        <StepDots current={3} total={4} />
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <div className="bg-accent-light rounded-xl p-6 mb-8">
          <div className="flex justify-center mb-6">
            <PatternSVG />
          </div>
          <h1 className="font-display text-[28px] text-ink leading-[1.25] mb-4">
            Du hast gerade systemisch gedacht.
          </h1>
          <p className="text-[16px] text-ink-2 leading-relaxed">
            Was du gerade erkannt hast — dieses Muster, diese Wiederholung — das ist der Anfang von Klarheit.
          </p>
        </div>

        <p className="text-[16px] text-ink-2 leading-relaxed">
          Es gibt einen Ansatz, der genau dabei hilft: nicht durch Ratschläge, sondern durch Fragen. Fragen, die dich anders denken lassen.
        </p>
      </div>

      <div className="pb-8">
        <Button variant="primary" className="w-full text-base py-4" onClick={onNext}>
          Zeig mir, wie das funktioniert →
        </Button>
      </div>
    </div>
  )
}
