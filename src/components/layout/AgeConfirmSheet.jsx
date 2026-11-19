import { useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import { createLogger } from '../../lib/logger'

const logger = createLogger('AgeConfirmSheet')

// S-11 (Paket C, C-3): Bestandsnutzer bestätigen einmalig, dass sie mindestens 18 sind.
// „Ja“ → RPC confirm_age (setzt profiles.age_confirmed_at serverseitig) → Profil neu laden.
// „Ich bin jünger“ → Hinweis auf 116 111 und den bestehenden Löschweg im Profil. Kein automatisches Löschen.
export function AgeConfirmSheet({ onConfirmed, onGoToProfile }) {
  const [step, setStep] = useState('ask')   // ask | younger
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const confirm = async () => {
    setBusy(true)
    setFailed(false)
    const { error } = await supabase.rpc('confirm_age')
    setBusy(false)
    if (error) {
      logger.error('confirm_age_failed', { code: error.code })
      setFailed(true)
      return
    }
    onConfirmed()
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Eine kurze Bestätigung">
      <div className="bg-surface rounded-t-2xl w-full max-w-lg p-6">
        {step === 'ask' ? (
          <>
            <h3 className="font-display text-[22px] text-ink mb-2">Eine kurze Bestätigung</h3>
            <p className="text-[14px] text-ink-2 leading-relaxed mb-5">
              Friedensstifter ist für Erwachsene gedacht. Magst du kurz bestätigen, dass du mindestens 18 Jahre alt bist?
            </p>
            {failed && (
              <p role="alert" className="text-[13px] text-ink-2 bg-surface-2 rounded-lg px-4 py-3 mb-3">
                Das hat gerade nicht geklappt. Versuch es bitte noch einmal.
              </p>
            )}
            <button
              onClick={confirm}
              disabled={busy}
              className="w-full bg-accent text-white text-[15px] font-medium py-3 rounded-full hover:bg-accent-2 transition-colors disabled:opacity-60 mb-2"
            >
              Ja, ich bin mindestens 18
            </button>
            <button onClick={() => setStep('younger')} className="w-full text-[13px] text-ink-3 py-2">
              Ich bin jünger
            </button>
          </>
        ) : (
          <>
            <h3 className="font-display text-[22px] text-ink mb-2">Danke, dass du ehrlich bist</h3>
            <p className="text-[14px] text-ink-2 leading-relaxed mb-3">
              Friedensstifter ist für Erwachsene gedacht. Wenn du gerade jemanden zum Reden brauchst, ist die Nummer gegen Kummer für dich da: <span className="text-ink font-medium">116 111</span>, kostenlos und anonym.
            </p>
            <a href="tel:116111" className="block w-full text-center bg-accent text-white text-[15px] font-medium py-3 rounded-full mb-3">
              116 111 anrufen
            </a>
            <p className="text-[13px] text-ink-2 leading-relaxed mb-3">
              Dein Konto kannst du im Profil unter „Konto löschen“ selbst löschen.
            </p>
            <button onClick={onGoToProfile} className="w-full text-[13px] text-accent font-medium py-2 hover:underline">
              Zum Profil
            </button>
            <button onClick={() => setStep('ask')} className="w-full text-[13px] text-ink-3 py-2">
              Zurück
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
