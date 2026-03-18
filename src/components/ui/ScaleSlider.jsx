import { useState } from 'react'
import { SCALING_HINTS } from '../../lib/prompts'
import { Button } from './Button'

export function ScaleSlider({ onSubmit }) {
  const [value, setValue] = useState(5)

  return (
    <div className="bg-surface border border-[var(--color-border)] rounded-lg p-5 shadow-sm">
      <p className="text-[13px] text-ink-2 mb-4">Wo stehst du gerade?</p>
      <div className="text-[28px] font-display text-accent text-center mb-3">{value}</div>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={e => setValue(Number(e.target.value))}
        className="w-full accent-[var(--color-accent)] cursor-pointer mb-3"
      />
      <div className="flex justify-between text-[11px] text-ink-3 mb-4">
        {[1,2,3,4,5,6,7,8,9,10].map(n => <span key={n}>{n}</span>)}
      </div>
      <p className="text-[13px] text-ink-2 italic mb-4">{SCALING_HINTS[value]}</p>
      <Button variant="primary" className="w-full" onClick={() => onSubmit(value)}>
        Das ist meine Einschätzung
      </Button>
    </div>
  )
}
