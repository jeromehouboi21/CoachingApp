// Angemeldet, aber ohne Zustimmung v2.0 (Paket K W3, Handoff 5.5). Steht in App.jsx vor allen
// geschützten Routen, nach der Code-Abfrage (S-06b). Reihenfolge: 18+ → Zustimmung.
//   Eingeladene ohne bisherige Zustimmung: Zustimmung → erstes Passwort (W3-2)
//   alle anderen (Version < 2.0 oder fehlend): Zustimmung als Vollbild, „Lieber nicht“ → Export,
//   Konto löschen (Profil), Abmelden. Die App bleibt bis zur Zustimmung gesperrt.
// Alle Funktionen kommen aus der useAuth-Instanz von App.jsx, damit sich die Sperre nach Erfolg löst.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConsentStep } from '../../components/legal/ConsentStep'
import { DeclineSheet } from '../../components/legal/DeclineSheet'
import { LegalSheet } from '../../components/legal/LegalSheet'
import { AgeConfirmSheet } from '../../components/layout/AgeConfirmSheet'
import { DataExportSheet } from '../../components/profile/DataExportSheet'
import { RECONSENT } from '../../content/legalTexts'
import { InvitedSetPassword } from './InvitedSetPassword'

const SAVE_FAILED = 'Deine Zustimmung konnte gerade nicht gespeichert werden. Versuch es bitte noch einmal.'

function ExistingDeclineSheet({ onClose, onExport, onDelete, onSignOut }) {
  return (
    <LegalSheet title={RECONSENT.declineTitle} onClose={onClose}>
      <p className="text-[14px] text-ink-2 leading-[1.7] mb-6">{RECONSENT.declineText}</p>
      <div className="flex flex-col gap-2">
        <button onClick={onExport} className="w-full bg-accent text-white py-3 rounded-full font-medium text-[15px] hover:bg-accent-2 transition-colors">
          Meine Daten herunterladen
        </button>
        <button onClick={onDelete} className="w-full border border-[var(--color-border)] text-ink py-3 rounded-full text-[15px] hover:bg-surface-2 transition-colors">
          Konto löschen
        </button>
        <button onClick={onSignOut} className="w-full text-[14px] text-ink-3 hover:text-ink-2 py-2">
          Abmelden
        </button>
        <button onClick={onClose} className="w-full text-[14px] text-ink-3 hover:text-ink-2 py-2">
          Zurück
        </button>
      </div>
    </LegalSheet>
  )
}

export function ConsentGateScreen({ profile, user, consentState, acceptConsentV2, refreshProfile, signOut }) {
  const navigate = useNavigate()
  const [ageDeferred, setAgeDeferred] = useState(false)
  const [invitePasswordStep, setInvitePasswordStep] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [declineOpen, setDeclineOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  const isInvitedNew = consentState === 'missing' && !!(user?.invited_at || profile?.invited_at)
  const needsAge = !!profile && !profile.age_confirmed_at && !ageDeferred

  const accept = async () => {
    setBusy(true)
    setError('')
    try {
      await acceptConsentV2()   // lädt das Profil neu → App gibt die Routen frei
    } catch {
      setError(SAVE_FAILED)
    } finally {
      setBusy(false)
    }
  }

  const goToProfile = () => navigate('/profile', { state: { ageDeferred: true } })

  let content
  if (isInvitedNew) {
    content = invitePasswordStep
      ? <InvitedSetPassword onConsent={acceptConsentV2} />
      : <ConsentStep onAccept={() => setInvitePasswordStep(true)} onDecline={() => setDeclineOpen(true)} />
  } else {
    content = (
      <ConsentStep
        title={consentState === 'outdated' ? RECONSENT.title : undefined}
        note={consentState === 'outdated' ? RECONSENT.pendingText : null}
        onAccept={accept}
        busy={busy}
        error={error}
        onDecline={() => setDeclineOpen(true)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-bg max-w-lg mx-auto">
      {content}

      {declineOpen && (isInvitedNew
        ? <DeclineSheet onClose={() => setDeclineOpen(false)} />
        : <ExistingDeclineSheet
            onClose={() => setDeclineOpen(false)}
            onExport={() => { setDeclineOpen(false); setExportOpen(true) }}
            onDelete={goToProfile}
            onSignOut={async () => { await signOut(); navigate('/landing', { replace: true }) }}
          />)}
      {exportOpen && <DataExportSheet onClose={() => setExportOpen(false)} />}

      {needsAge && (
        <AgeConfirmSheet
          onConfirmed={() => refreshProfile()}
          onGoToProfile={() => { setAgeDeferred(true); goToProfile() }}
        />
      )}
    </div>
  )
}
