// Anmeldung mit Wiederherstellungscode (S-06b): mfa-recovery recover → alle Faktoren entfernt.
// Nie den Code loggen.
import { useState } from 'react'
import { Button } from '../ui/Button'
import { callMfaRecovery } from '../../lib/mfa'
import { GENERIC_ERROR } from './MfaCodeForm'

export function RecoveryForm({ onRecovered, onCancel }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '')

  const submit = async (e) => {
    e.preventDefault()
    if (normalized.length !== 10 || busy) return
    setBusy(true)
    setError(null)
    const res = await callMfaRecovery('recover', { code })
    setBusy(false)
    if (res.ok) { onRecovered(); return }
    if (res.status === 400 && res.data?.error === 'invalid_code') {
      setError('Dieser Code passt nicht oder wurde schon verwendet. Prüf die Schreibweise und versuch es noch einmal.')
    } else if (res.status === 429) {
      setError('Das waren gerade viele Versuche. Versuch es bitte später noch einmal.')
    } else {
      setError(GENERIC_ERROR)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label htmlFor="recovery-code" className="text-[12px] text-ink-3 font-medium uppercase tracking-wide">
        Wiederherstellungscode
      </label>
      <input
        id="recovery-code"
        value={code}
        onChange={(e) => setCode(e.target.value.slice(0, 20))}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        placeholder="XXXXX-XXXXX"
        className="w-full bg-surface border border-[var(--color-border)] rounded-lg px-4 py-3 text-[18px] font-mono tracking-wider text-ink placeholder:text-ink-3 outline-none focus:border-accent transition-colors"
      />
      {error && <p role="alert" className="text-[13px] text-coral">{error}</p>}
      <Button type="submit" variant="primary" className="w-full py-4" disabled={busy || normalized.length !== 10}>
        {busy ? 'Wird geprüft…' : 'Code verwenden'}
      </Button>
      <button type="button" onClick={onCancel} className="text-[13px] text-ink-3 self-center">
        Zurück zur Code-Abfrage
      </button>
    </form>
  )
}
