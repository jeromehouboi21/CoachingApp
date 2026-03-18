import { Button } from '../../components/ui/Button'

const AREAS = [
  {
    id: 'work',
    icon: '💼',
    title: 'Im Job',
    description: 'Ich sage nicht, was ich wirklich denke. Oder ich reagiere zu stark.',
  },
  {
    id: 'relationships',
    icon: '🤝',
    title: 'In Beziehungen',
    description: 'Ich ziehe mich zurück. Oder ich kämpfe zu hart.',
  },
  {
    id: 'self',
    icon: '🧘',
    title: 'Mit mir selbst',
    description: 'Ich zweifle. Treffe keine Entscheidung. Oder strenge mich zu sehr an.',
  },
]

const StepDots = ({ current, total }) => (
  <div className="flex gap-2">
    {Array.from({ length: total }).map((_, i) => (
      <span key={i} className={`w-2 h-2 rounded-full transition-all ${i + 1 === current ? 'bg-accent w-4' : 'bg-ink-3'}`} />
    ))}
  </div>
)

export function Step2Question({ onNext, selectedArea, setSelectedArea }) {
  return (
    <div className="flex flex-col min-h-screen px-6 py-10 animate-[fadeSlideUp_0.4s_ease]">
      <div className="flex items-center justify-between mb-10">
        <span className="font-display text-[28px] text-ink">Friedensstifter</span>
        <StepDots current={2} total={4} />
      </div>

      <div className="mb-6">
        <h1 className="font-display text-[28px] text-ink leading-[1.25] mb-2">
          Gibt es eine Situation, in der du immer wieder gleich reagierst — obwohl du dir wünschst, es wäre anders?
        </h1>
        <p className="text-[16px] text-ink-2">Kein Urteil. Nur eine ehrliche Frage.</p>
      </div>

      <div className="flex flex-col gap-3 flex-1">
        {AREAS.map(area => (
          <button
            key={area.id}
            onClick={() => setSelectedArea(area.id)}
            className={`text-left p-4 rounded-lg border transition-all ${
              selectedArea === area.id
                ? 'bg-accent-light border-accent'
                : 'bg-surface border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
            }`}
          >
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xl">{area.icon}</span>
              <span className="font-medium text-[15px] text-ink">{area.title}</span>
            </div>
            <p className="text-[13px] text-ink-2 leading-relaxed pl-9">{area.description}</p>
          </button>
        ))}
      </div>

      <div className="pb-8 pt-4">
        {selectedArea && (
          <Button variant="primary" className="w-full text-base py-4 animate-[fadeSlideUp_0.3s_ease]" onClick={onNext}>
            Das kenne ich
          </Button>
        )}
      </div>
    </div>
  )
}
