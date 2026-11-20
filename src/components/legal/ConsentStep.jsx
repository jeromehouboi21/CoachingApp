// Screen 3 „Deine Zustimmung“ (Paket K W3, Konzept 2.4). Eine Fassung für drei Wege:
// neuer Einstieg (/start/3), Eingeladene und Bestandsnutzer (erneute Zustimmung, ConsentGateScreen).
// Die Häkchen leben nur in diesem Zustand; gespeichert wird erst vom Server (Signup-Metadaten bzw.
// RPC accept_consent_v2). Kein localStorage.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AGREEMENT_SUMMARY, AGREEMENT_CHECKBOX, CONSENT_ART9_CHECKBOX, CONSENT_WITHDRAWAL,
} from '../../content/legalTexts'
import { CoachingAgreementContent } from './CoachingAgreementContent'
import { LegalSheet } from './LegalSheet'

export function ConsentStep({ title = AGREEMENT_SUMMARY.title, intro = AGREEMENT_SUMMARY.intro, onAccept, busy = false, error = '', onDecline, header = null }) {
  const [agreement, setAgreement] = useState(false)
  const [art9, setArt9] = useState(false)
  const [showFull, setShowFull] = useState(false)

  return (
    <div className="flex flex-col min-h-screen px-6 py-10 animate-[fadeSlideUp_0.4s_ease]">
      {header}

      <h1 className="font-display text-[26px] text-ink leading-[1.25] mb-2">{title}</h1>
      <p className="text-[14px] text-ink-2 leading-relaxed mb-6">{intro}</p>

      <ul className="flex flex-col gap-3 mb-5">
        {AGREEMENT_SUMMARY.points.map(pt => (
          <li key={pt} className="flex items-start gap-2 text-[14px] text-ink-2 leading-[1.6]">
            <span className="text-accent flex-shrink-0" aria-hidden="true">·</span>
            <span>{pt}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-x-5 gap-y-1 mb-6">
        <button type="button" onClick={() => setShowFull(true)} className="text-[13px] text-accent hover:underline">
          Ganze Vereinbarung lesen ›
        </button>
        <Link to="/datenschutz" target="_blank" rel="noopener noreferrer" className="text-[13px] text-accent hover:underline">
          Datenschutzerklärung ›
        </Link>
      </div>

      <div className="flex flex-col gap-4 mb-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreement}
            onChange={e => setAgreement(e.target.checked)}
            className="mt-0.5 flex-shrink-0 accent-[var(--color-accent)]"
          />
          <span className="text-[13px] text-ink-2 leading-snug">{AGREEMENT_CHECKBOX}</span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={art9}
            onChange={e => setArt9(e.target.checked)}
            className="mt-0.5 flex-shrink-0 accent-[var(--color-accent)]"
          />
          <span className="text-[13px] text-ink-2 leading-snug">
            {CONSENT_ART9_CHECKBOX}{' '}
            <span className="text-ink-3">{CONSENT_WITHDRAWAL}</span>
          </span>
        </label>
      </div>

      {error && <p role="alert" className="text-[13px] text-ink-2 bg-surface-2 rounded-lg px-4 py-3 mb-3">{error}</p>}

      <button
        type="button"
        onClick={onAccept}
        disabled={!agreement || !art9 || busy}
        className="w-full bg-accent text-white py-4 rounded-full font-medium text-[15px] hover:bg-accent-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {busy ? 'Wird gespeichert…' : 'Zustimmen und weiter'}
      </button>
      <button type="button" onClick={onDecline} className="w-full text-[14px] text-ink-3 hover:text-ink-2 py-3 mb-6">
        Lieber nicht
      </button>

      {showFull && (
        <LegalSheet title="Coaching-Vereinbarung" onClose={() => setShowFull(false)}>
          <CoachingAgreementContent />
        </LegalSheet>
      )}
    </div>
  )
}
