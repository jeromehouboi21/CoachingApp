// Admin-Bereich absichern (S-06): zweiten Faktor einrichten bzw. Code eingeben.
// Texte nach Lösungsdesign Paket B, Abschnitt 5.1/5.2. Bausteine seit S-06b in src/components/mfa/.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { MfaCodeForm, WRONG_CODE, GENERIC_ERROR } from '../../components/mfa/MfaCodeForm'
import { MfaEnrollFlow } from '../../components/mfa/MfaEnrollFlow'

export function AdminMfaScreen({ mfa }) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [factorIndex, setFactorIndex] = useState(0)

  const mode = mfa.enrolledJustNow ? 'success'
    : (mfa.factors.length === 0 || mfa.addingDevice) ? 'enroll'
    : 'verify'

  const handleVerify = async (code, reset) => {
    setBusy(true)
    setError(null)
    const res = await mfa.verify(mfa.factors[factorIndex]?.id, code)
    setBusy(false)
    if (res.error) {
      setError(res.error === 'wrong_code' ? WRONG_CODE : GENERIC_ERROR)
      reset()
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
          <MfaEnrollFlow
            startEnroll={mfa.startEnroll}
            verify={(factorId, code) => mfa.verify(factorId, code, { isEnrollment: true })}
          />
        </div>
      )}

      {mode === 'verify' && (
        <div className="flex flex-col gap-5">
          <h1 className="font-display text-[24px] text-ink">Admin-Bereich</h1>
          <p className="text-[14px] text-ink-2 leading-relaxed">
            Gib den Code aus deiner Authenticator-App ein.
          </p>
          <MfaCodeForm
            onSubmit={handleVerify}
            busy={busy}
            error={error}
            factors={mfa.factors}
            factorIndex={factorIndex}
            onSelectFactor={(i) => { setFactorIndex(i); setError(null) }}
          />
        </div>
      )}
    </div>
  )
}
