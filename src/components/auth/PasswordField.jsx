// Passwortfeld mit Sichtbar-Schalter (Paket K, W1). autoComplete: 'current-password' | 'new-password'.
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export function PasswordField({ id, label, value, onChange, autoComplete, placeholder, hint }) {
  const [visible, setVisible] = useState(false)
  return (
    <div>
      <label htmlFor={id} className="text-[12px] text-ink-3 font-medium uppercase tracking-wide block mb-1.5">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="w-full bg-surface border border-[var(--color-border)] rounded-lg px-4 py-3 pr-12 text-[15px] text-ink placeholder:text-ink-3 outline-none focus:border-accent transition-colors"
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          aria-label={visible ? 'Passwort verbergen' : 'Passwort anzeigen'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink-2"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {hint && <p className="text-[12px] text-ink-3 mt-1.5">{hint}</p>}
    </div>
  )
}
