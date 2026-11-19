// Einrichtung eines TOTP-Faktors: QR-Code, Schlüssel zum Abtippen, Code bestätigen (S-06 / S-06b).
// startEnroll() → { factorId, qrCode, secret } | { error } · verify(factorId, code) → { error }
// Nie QR-Code oder Schlüssel loggen.
import { useEffect, useState } from 'react'
import { MfaCodeForm, WRONG_CODE, GENERIC_ERROR } from './MfaCodeForm'

function groupSecret(secret) {
  return (secret ?? '').replace(/\s/g, '').match(/.{1,4}/g)?.join(' ') ?? ''
}

export function MfaEnrollFlow({ startEnroll, verify, onVerified }) {
  const [enrollment, setEnrollment] = useState(null)
  const [enrollError, setEnrollError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    startEnroll().then((res) => {
      if (cancelled) return
      if (res.error) setEnrollError(GENERIC_ERROR)
      else setEnrollment(res)
    })
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleVerify = async (code, reset) => {
    setBusy(true)
    setError(null)
    const res = await verify(enrollment.factorId, code)
    setBusy(false)
    if (res.error) {
      setError(res.error === 'wrong_code' ? WRONG_CODE : GENERIC_ERROR)
      reset()
      return
    }
    onVerified?.()
  }

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText((enrollment?.secret ?? '').replace(/\s/g, ''))
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  if (enrollError) return <p role="alert" className="text-[13px] text-coral">{enrollError}</p>
  if (!enrollment) return <p className="text-[13px] text-ink-3">Wird vorbereitet…</p>

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-surface border border-[var(--color-border)] rounded-2xl p-5 flex flex-col items-center gap-4">
        {enrollment.qrCode && (
          <img src={enrollment.qrCode} alt="QR-Code für deine Authenticator-App" className="w-48 h-48" />
        )}
        <div className="text-center">
          <p className="text-[12px] text-ink-3 mb-1">Code lässt sich nicht scannen?</p>
          <p className="text-[13px] text-ink-3 font-mono break-all select-all">
            Schlüssel: {groupSecret(enrollment.secret)}
          </p>
          <button type="button" onClick={copySecret} className="text-[12px] text-accent mt-1">
            {copied ? 'Kopiert' : 'Schlüssel kopieren'}
          </button>
        </div>
      </div>
      <MfaCodeForm onSubmit={handleVerify} busy={busy} error={error} />
    </div>
  )
}
