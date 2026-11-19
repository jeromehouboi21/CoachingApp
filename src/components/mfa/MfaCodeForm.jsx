// 6-stelliger Code aus der Authenticator-App, optional mit Geräteauswahl (S-06 / S-06b).
// Nie den Code loggen.
import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui/Button'

export const WRONG_CODE = 'Der Code passt nicht. Prüf die Uhrzeit auf deinem Gerät und versuch es noch einmal.'
export const GENERIC_ERROR = 'Das hat gerade nicht geklappt. Versuch es bitte noch einmal.'

export function MfaCodeForm({ onSubmit, busy, error, factors = [], factorIndex = 0, onSelectFactor }) {
  const [code, setCode] = useState('')
  const inputRef = useRef(null)
  useEffect(() => { inputRef.current?.focus() }, [])

  const submit = (value) => {
    if (value.length === 6 && !busy) onSubmit(value, () => setCode(''))
  }

  return (
    <div className="flex flex-col gap-4">
      {factors.length > 1 && onSelectFactor && (
        <div className="flex flex-wrap gap-2">
          {factors.map((f, i) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onSelectFactor(i)}
              className={`text-[13px] px-3 py-1.5 rounded-full border ${i === factorIndex ? 'border-accent text-accent bg-accent-light' : 'border-[var(--color-border)] text-ink-2'}`}
            >
              {f.friendly_name || `Gerät ${i + 1}`}
            </button>
          ))}
        </div>
      )}
      <form
        onSubmit={(e) => { e.preventDefault(); submit(code) }}
        className="flex flex-col gap-3"
      >
        <label htmlFor="mfa-code" className="text-[12px] text-ink-3 font-medium uppercase tracking-wide">
          6-stelliger Code
        </label>
        <input
          id="mfa-code"
          ref={inputRef}
          value={code}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 6)
            setCode(v)
            if (v.length === 6) submit(v)
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="123456"
          className="w-full bg-surface border border-[var(--color-border)] rounded-lg px-4 py-3 text-[22px] tracking-[0.4em] text-ink placeholder:text-ink-3 placeholder:tracking-normal outline-none focus:border-accent transition-colors"
        />
        {error && <p role="alert" className="text-[13px] text-coral">{error}</p>}
        <Button type="submit" variant="primary" className="w-full py-4" disabled={busy || code.length !== 6}>
          {busy ? 'Wird geprüft…' : 'Bestätigen'}
        </Button>
      </form>
    </div>
  )
}
