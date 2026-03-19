import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { WELLNESS_SCORES, WELLNESS_CONTEXT_CHIPS, getWellnessRange } from '../../lib/prompts'

export function WellnessCheckScreen() {
  const navigate = useNavigate()
  const [score, setScore] = useState(5)
  const [selectedChips, setSelectedChips] = useState([])
  const [freeText, setFreeText] = useState('')

  const range = getWellnessRange(score)
  const { label, emoji, color } = WELLNESS_SCORES[score]
  const chips = WELLNESS_CONTEXT_CHIPS[range]

  // Reset chips when score range changes
  useEffect(() => {
    setSelectedChips([])
  }, [range])

  const toggleChip = (chip) => {
    setSelectedChips(prev =>
      prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip]
    )
  }

  const handleSubmit = () => {
    const contextParts = [
      ...selectedChips,
      freeText.trim() || null,
    ].filter(Boolean)
    const context = contextParts.join(', ')

    navigate('/coach', {
      replace: true,
      state: {
        wellnessCheck: { score, label, emoji, context }
      }
    })
  }

  // Slider fill percentage for gradient
  const fillPercent = ((score - 1) / 9) * 100

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
          Selbsteinschätzung
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pb-8 flex flex-col">
        {/* Title */}
        <div className="mb-8">
          <h1 className="font-display text-[28px] text-ink leading-[1.25] mb-2">
            Wie geht es dir<br />gerade?
          </h1>
          <p className="text-[15px] text-ink-2">
            Auf einer Skala von 1 bis 10 — ganz ehrlich.
          </p>
        </div>

        {/* Score Display */}
        <div className="flex items-center justify-center gap-5 mb-8">
          <span className="text-[52px] leading-none">{emoji}</span>
          <div className="flex flex-col">
            <span
              className="font-display text-[56px] leading-none transition-colors duration-200"
              style={{ color }}
            >
              {score}
            </span>
            <span className="text-[14px] text-ink-2 mt-1">{label}</span>
          </div>
        </div>

        {/* Slider */}
        <div className="mb-8">
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={score}
            onChange={e => setScore(Number(e.target.value))}
            className="w-full h-[6px] rounded-full appearance-none cursor-pointer"
            style={{
              accentColor: color,
              background: `linear-gradient(to right, ${color} ${fillPercent}%, var(--color-surface-2) ${fillPercent}%)`,
            }}
          />
          <div className="flex justify-between mt-2">
            <span className="text-[12px] text-ink-3">1 – Sehr schlecht</span>
            <span className="text-[12px] text-ink-3">10 – Fantastisch</span>
          </div>
        </div>

        {/* Context Chips */}
        <div className="mb-5">
          <p className="text-[15px] font-medium text-ink mb-1">
            Was bewegt dich zu dieser Einschätzung?
          </p>
          <p className="text-[13px] text-ink-3 mb-3">
            Optional — aber je mehr der Coach weiß, desto besser kann er fragen.
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {chips.map(chip => {
              const active = selectedChips.includes(chip)
              return (
                <button
                  key={chip}
                  onClick={() => toggleChip(chip)}
                  className="px-4 py-1.5 rounded-full text-[13px] border-[1.5px] transition-all"
                  style={active
                    ? { backgroundColor: 'var(--color-accent-light)', borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }
                    : { backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-ink-2)' }
                  }
                >
                  {chip}
                </button>
              )
            })}
          </div>

          {/* Free Text */}
          <textarea
            value={freeText}
            onChange={e => setFreeText(e.target.value)}
            placeholder="Oder beschreib es mit eigenen Worten…"
            rows={3}
            className="w-full border-[1.5px] border-[var(--color-border)] rounded-xl px-4 py-3 text-[15px] text-ink bg-bg placeholder:text-ink-3 resize-none focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />
        </div>

        {/* CTA */}
        <div className="mt-auto">
          <button
            onClick={handleSubmit}
            className="w-full bg-accent text-white text-[16px] font-medium py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-accent-2 transition-colors"
          >
            Gespräch beginnen →
          </button>
          <p className="text-[12px] text-ink-3 text-center mt-3">
            Der Coach startet direkt dort, wo du gerade stehst.
          </p>
        </div>
      </div>
    </div>
  )
}
