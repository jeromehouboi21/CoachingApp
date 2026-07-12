import { useNavigate } from 'react-router-dom'
import { ChevronLeft, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { CoachingAgreementContent } from '../../components/legal/CoachingAgreementContent'

const formatAcceptedAt = (iso) => {
  if (!iso) return null
  return new Date(iso).toLocaleString('de-DE', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function CoachingAgreementScreen() {
  const navigate = useNavigate()
  const { profile } = useAuth()

  const acceptedAt = formatAcceptedAt(profile?.coaching_agreement_accepted_at)
  const version = profile?.coaching_agreement_version

  return (
    <div className="min-h-screen bg-bg">
      <div className="px-5 pt-12 pb-24 max-w-lg mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-ink-3 text-[13px] mb-6"
        >
          <ChevronLeft size={16} />
          Zurück
        </button>

        <h1 className="font-display text-[24px] text-ink mb-1">Coaching-Vereinbarung</h1>
        <p className="text-[12px] text-ink-3 mb-6">
          {version ? `Version ${version}` : 'Aktuelle Version'}
        </p>

        {/* Zustimmungs-Nachweis */}
        {acceptedAt ? (
          <div className="flex items-start gap-3 bg-surface border border-[var(--color-border)] rounded-xl p-4 mb-8">
            <CheckCircle2 size={18} color="var(--color-accent)" className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] text-ink font-medium">Du hast dieser Vereinbarung zugestimmt</p>
              <p className="text-[13px] text-ink-3 mt-0.5">am {acceptedAt} Uhr</p>
            </div>
          </div>
        ) : (
          <div className="bg-surface border border-[var(--color-border)] rounded-xl p-4 mb-8">
            <p className="text-[13px] text-ink-3">
              Für dein Konto ist noch kein Zustimmungsdatum hinterlegt.
            </p>
          </div>
        )}

        <CoachingAgreementContent />
      </div>
    </div>
  )
}
