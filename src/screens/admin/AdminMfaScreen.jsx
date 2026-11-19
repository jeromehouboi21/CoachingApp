// Admin-Bereich absichern (S-06): zweiten Faktor einrichten bzw. Code eingeben.
// Texte nach Lösungsdesign Paket B, Abschnitt 5.1/5.2.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { Button } from '../../components/ui/Button'

const WRONG_CODE = 'Der Code passt nicht. Prüf die Uhrzeit auf deinem Gerät und versuch es noch einmal.'
const GENERIC_ERROR = 'Das hat gerade nicht geklappt. Versuch es bitte noch einmal.'

function groupSecret(secret) {
  return (secret ?? '').replace(/\s/g, '').match(/.{1,4}/g)?.join(' ') ?? ''
}

function CodeInput({ onSubmit, busy, error }) {
  const [code, setCode] = useState('')
  const inputRef = useRef(null)
  useEffect(() => { inputRef.current?.focus() }, [])

  const submit = (value) => {
    if (value.length === 6 && !busy) onSubmit(value, () => setCode(''))
  }

  return (
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
      {error && <p className="text-[13px] text-coral">{error}</p>}
      <Button type="submit" variant="primary" className="w-full py-4" disabled={busy || code.length !== 6}>
        {busy ? 'Wird geprüft…' : 'Bestätigen'}
      </Button>
    </form>
  )
}

export function AdminMfaScreen({ mfa }) {
  const navigate = useNavigate()
  const [enrollment, setEnrollment] = useState(null) // { factorId, qrCode, secret }
  const [enrollError, setEnrollError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [factorIndex, setFactorIndex] = useState(0)

  const mode = mfa.enrolledJustNow ? 'success'
    : (mfa.factors.length === 0 || mfa.addingDevice) ? 'enroll'
    : 'verify'

  // Einrichtung starten, sobald der Einrichten-Zustand erreicht ist
  useEffect(() => {
    if (mode !== 'enroll' || enrollment) return
    let cancelled = false
    mfa.startEnroll().then((res) => {
      if (cancelled) return
      if (res.error) setEnrollError(GENERIC_ERROR)
      else setEnrollment(res)
    })
    return () => { cancelled = true }
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleVerify = async (code, reset) => {
    setBusy(true)
    setError(null)
    const factorId = mode === 'enroll' ? enrollment?.factorId : mfa.factors[factorIndex]?.id
    const res = await mfa.verify(factorId, code, { isEnrollment: mode === 'enroll' })
    setBusy(false)
    if (res.error) {
      setError(res.error === 'wrong_code' ? WRONG_CODE : GENERIC_ERROR)
      reset()
    } else if (mode === 'enroll') {
      setEnrollment(null)
    }
  }

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText((enrollment?.secret ?? '').replace(/\s/g, ''))
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col max-w-lg mx-auto px-6 py-10">
      <button
        onClick={() => (mfa.addingDevice ? mfa.cancelAddDevice() : navigate('/profile'))}
        className="flex items-center gap-2 text-ink-3 hover:text-ink-2 transition-colors mb-8 self-start"
      >
        <ChevronLeft size={18} />
        <span className="text-[14px]">Zurück</span>
      </button>

      {mode === 'success' && (
        <div className="flex flex-col gap-5">
          <h1 className="font-display text-[24px] text-ink">Admin-Bereich <em>abgesichert</em></h1>
          <div className="bg-accent-light rounded-2xl p-5">
            <p className="text-[15px] text-ink font-medium mb-2">Geschafft.</p>
            <p className="text-[14px] text-ink-2 leading-relaxed">
              Dein Admin-Bereich ist jetzt mit einem zweiten Faktor geschützt.
            </p>
            <p className="text-[14px] text-ink-2 leading-relaxed mt-2">
              Tipp: Richte ein zweites Gerät ein, falls du dein Handy einmal nicht zur Hand hast.
            </p>
          </div>
          <Button variant="secondary" className="w-full py-3" onClick={mfa.beginAddDevice}>
            Zweites Gerät hinzufügen
          </Button>
          <button onClick={mfa.dismissSuccess} className="text-[14px] text-accent font-medium self-center">
            Weiter zum Admin-Bereich →
          </button>
        </div>
      )}

      {mode === 'enroll' && (
        <div className="flex flex-col gap-5">
          <h1 className="font-display text-[24px] text-ink">
            {mfa.addingDevice ? 'Weiteres Gerät ' : 'Admin-Bereich '}<em>{mfa.addingDevice ? 'hinzufügen' : 'absichern'}</em>
          </h1>
          <p className="text-[14px] text-ink-2 leading-relaxed">
            Hier siehst du Daten aller Nutzer. Deshalb fragt die App zusätzlich nach einem Code
            aus deiner Authenticator-App.
          </p>
          {enrollError && <p className="text-[13px] text-coral">{enrollError}</p>}
          {!enrollment && !enrollError && <p className="text-[13px] text-ink-3">Wird vorbereitet…</p>}
          {enrollment && (
            <>
              <div className="bg-surface border border-[var(--color-border)] rounded-2xl p-5 flex flex-col items-center gap-4">
                {enrollment.qrCode && (
                  <img src={enrollment.qrCode} alt="QR-Code für deine Authenticator-App" className="w-48 h-48" />
                )}
                <div className="text-center">
                  <p className="text-[12px] text-ink-3 mb-1">Code lässt sich nicht scannen?</p>
                  <p className="text-[13px] text-ink-3 font-mono break-all select-all">
                    Schlüssel: {groupSecret(enrollment.secret)}
                  </p>
                  <button onClick={copySecret} className="text-[12px] text-accent mt-1">
                    {copied ? 'Kopiert' : 'Schlüssel kopieren'}
                  </button>
                </div>
              </div>
              <CodeInput onSubmit={handleVerify} busy={busy} error={error} />
            </>
          )}
        </div>
      )}

      {mode === 'verify' && (
        <div className="flex flex-col gap-5">
          <h1 className="font-display text-[24px] text-ink">Admin-Bereich</h1>
          <p className="text-[14px] text-ink-2 leading-relaxed">
            Gib den Code aus deiner Authenticator-App ein.
          </p>
          {mfa.factors.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {mfa.factors.map((f, i) => (
                <button
                  key={f.id}
                  onClick={() => { setFactorIndex(i); setError(null) }}
                  className={`text-[13px] px-3 py-1.5 rounded-full border ${i === factorIndex ? 'border-accent text-accent bg-accent-light' : 'border-[var(--color-border)] text-ink-2'}`}
                >
                  {f.friendly_name || `Gerät ${i + 1}`}
                </button>
              ))}
            </div>
          )}
          <CodeInput onSubmit={handleVerify} busy={busy} error={error} />
        </div>
      )}
    </div>
  )
}
