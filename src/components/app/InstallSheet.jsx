// Paket P: Anleitung bzw. Installations-Knopf je Gerät (Texte Handoff 4.4).
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { ShareIcon } from './ShareIcon'

export function InstallSheet({ mode, install, onClose }) {
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)

  const doInstall = async () => {
    setBusy(true)
    const outcome = await install()
    setBusy(false)
    if (outcome === 'failed' || outcome === 'unavailable') { setFailed(true); return }
    onClose()
  }

  let content
  if (mode === 'prompt') {
    content = (
      <>
        <h3 className="font-display text-[22px] text-ink mb-2">Friedensstifter auf deinem Startbildschirm</h3>
        <p className="text-[14px] text-ink-2 leading-relaxed mb-5">Dann öffnest du die App mit einem Tipp, ohne Browser drumherum.</p>
        {failed && <p role="alert" className="text-[13px] text-ink-2 bg-surface-2 rounded-lg px-4 py-3 mb-3">Das hat gerade nicht geklappt. Du kannst es später im Profil noch einmal versuchen.</p>}
        <button onClick={doInstall} disabled={busy} className="w-full bg-accent text-white py-3 rounded-full font-medium hover:bg-accent-2 transition-colors disabled:opacity-60 mb-2">
          Auf den Startbildschirm
        </button>
        <button onClick={onClose} className="w-full text-[14px] text-ink-3 py-2">Später</button>
      </>
    )
  } else if (mode === 'ios_manual') {
    content = (
      <>
        <h3 className="font-display text-[22px] text-ink mb-3">Friedensstifter auf deinem Home-Bildschirm</h3>
        <ol className="flex flex-col gap-2 text-[14px] text-ink-2 leading-relaxed mb-5 list-decimal pl-5">
          <li>Tippe unten auf das Teilen-Symbol <ShareIcon /> (Quadrat mit Pfeil).</li>
          <li>Wähle „Zum Home-Bildschirm“.</li>
          <li>Öffne Friedensstifter dann über das neue Symbol und melde dich einmal neu an.</li>
        </ol>
        <button onClick={onClose} className="w-full bg-accent text-white py-3 rounded-full font-medium hover:bg-accent-2 transition-colors">Verstanden</button>
      </>
    )
  } else {
    content = (
      <>
        <h3 className="font-display text-[22px] text-ink mb-2">Kurzer Umweg über den Browser</h3>
        <p className="text-[14px] text-ink-2 leading-relaxed mb-5">In dieser App lässt sich Friedensstifter nicht installieren. Öffne den Link über das Menü (⋯) in Safari bzw. Chrome, dann klappt es.</p>
        <button onClick={onClose} className="w-full bg-accent text-white py-3 rounded-full font-medium hover:bg-accent-2 transition-colors">Verstanden</button>
      </>
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Auf den Startbildschirm">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-surface w-full max-w-lg rounded-t-2xl p-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
        <button onClick={onClose} aria-label="Schließen" className="absolute right-4 top-4 p-1 text-ink-3 hover:text-ink-2"><X size={18} /></button>
        {content}
      </div>
    </div>,
    document.body,
  )
}
