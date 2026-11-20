// Opt-in Lernbasis (S-13). Texte seit Paket K aus src/content/legalTexts.js (LEARNING_OPT_IN, v2.0):
// eigene, ausdrückliche Einwilligung mit Häkchen.
// Geändert wird nur über die RPC set_learning_opt_in (Profilfelder sind für den Client gesperrt).
// Kein Erfolgshinweis ohne Erfolg: Der Schalter zeigt immer den Stand aus dem Profil.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import { createLogger } from '../../lib/logger'
import { LEARNING_CONSENT_VERSION } from '../../lib/consent'
import { reportIfMfaRpcError } from '../../lib/mfa'
import { LEARNING_OPT_IN } from '../../content/legalTexts'

const logger = createLogger('LearningConsentCard')
const ERROR_TEXT = 'Das hat gerade nicht geklappt. Versuch es bitte noch einmal.'

function Sheet({ children, onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-surface w-full max-w-lg rounded-t-2xl max-h-[85vh] overflow-y-auto p-6 pb-10">
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function LearningConsentCard({ profile, onChanged }) {
  const optedIn = !!profile?.learning_opt_in
  const [sheet, setSheet] = useState(null) // 'info' | 'revoke' | null
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [checked, setChecked] = useState(false)

  const setOptIn = async (value) => {
    setBusy(true)
    setError(null)
    const { data, error: rpcError } = await supabase.rpc('set_learning_opt_in', {
      p_opt_in: value,
      p_version: value ? LEARNING_CONSENT_VERSION : null,
    })
    setBusy(false)
    if (rpcError) {
      reportIfMfaRpcError(rpcError)
      logger.warn('learning_opt_in_failed', { code: rpcError.code ?? 'unknown', optIn: value })
      setError(ERROR_TEXT)
      return
    }
    logger.info('learning_opt_in_changed', { optIn: value })
    setSheet(null)
    if (!value) {
      const deleted = Number(data?.deleted ?? 0)
      setNotice(deleted > 0
        ? `Erledigt. ${deleted} ${deleted === 1 ? 'Beitrag wurde' : 'Beiträge wurden'} gelöscht.`
        : 'Erledigt. Es lagen keine Beiträge vor.')
    } else {
      setNotice(null)
    }
    await onChanged?.()
  }

  const openToggle = () => {
    setError(null)
    setNotice(null)
    setChecked(false)
    setSheet(optedIn ? 'revoke' : 'info')
  }

  return (
    <>
      <div className="bg-surface border border-[var(--color-border)] rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="text-[15px] text-ink">{LEARNING_OPT_IN.title}</p>
            <p className="text-[13px] text-ink-3 leading-relaxed mt-1">
              Freiwillig. Der Begleiter funktioniert für dich auch ohne Zustimmung genauso.
            </p>
            <button onClick={() => { setError(null); setChecked(false); setSheet('info') }} className="text-[13px] text-accent mt-1">
              Mehr dazu →
            </button>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={optedIn}
            aria-label={LEARNING_OPT_IN.title}
            onClick={openToggle}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5 ${optedIn ? 'bg-accent' : 'bg-[var(--color-border)]'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${optedIn ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </div>
        {notice && <p className="text-[13px] text-accent mt-3">{notice}</p>}
        {error && !sheet && <p className="text-[13px] text-coral mt-3">{error}</p>}
      </div>

      {sheet === 'info' && (
        <Sheet onClose={() => setSheet(null)}>
          <h3 className="font-display text-[22px] text-ink mb-4">{LEARNING_OPT_IN.title}</h3>
          <p className="text-[14px] text-ink-2 leading-relaxed mb-4">{LEARNING_OPT_IN.text}</p>
          {!optedIn && (
            <label className="flex items-start gap-3 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={checked}
                onChange={e => setChecked(e.target.checked)}
                className="mt-0.5 flex-shrink-0 accent-[var(--color-accent)]"
              />
              <span className="text-[13px] text-ink-2 leading-snug">{LEARNING_OPT_IN.checkbox}</span>
            </label>
          )}
          <p className="text-[13px] text-ink-3 leading-relaxed mb-5">{LEARNING_OPT_IN.withdrawal}</p>
          {error && <p className="text-[13px] text-coral mb-3">{error}</p>}
          {optedIn ? (
            <button onClick={() => setSheet(null)} className="w-full bg-accent text-white py-3 rounded-full font-medium hover:bg-accent-2 transition-colors">
              Schließen
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setOptIn(true)}
                disabled={busy || !checked}
                className="w-full bg-accent text-white py-3 rounded-full font-medium hover:bg-accent-2 transition-colors disabled:opacity-50"
              >
                {busy ? 'Wird gespeichert…' : 'Ja, ich mache mit'}
              </button>
              <button onClick={() => setSheet(null)} className="w-full text-[14px] text-ink-3 py-2">
                Lieber nicht
              </button>
            </div>
          )}
        </Sheet>
      )}

      {sheet === 'revoke' && (
        <Sheet onClose={() => setSheet(null)}>
          <h3 className="font-display text-[22px] text-ink mb-4">Zustimmung zurücknehmen?</h3>
          <p className="text-[14px] text-ink-2 leading-relaxed mb-5">
            Deine Erfahrungen in der Lernbasis werden gelöscht. Deine Gespräche und dein Spiegel
            bleiben unverändert.
          </p>
          {error && <p className="text-[13px] text-coral mb-3">{error}</p>}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setOptIn(false)}
              disabled={busy}
              className="w-full bg-accent text-white py-3 rounded-full font-medium hover:bg-accent-2 transition-colors disabled:opacity-50"
            >
              {busy ? 'Wird gespeichert…' : 'Zurücknehmen'}
            </button>
            <button onClick={() => setSheet(null)} className="w-full text-[14px] text-ink-3 py-2">
              Abbrechen
            </button>
          </div>
        </Sheet>
      )}
    </>
  )
}
