// Paket P (P-3): einmalige Einladung auf Heute, frühestens nach dem 2. Gespräch, nie im Gespräch.
// „Später“ oder „Verstanden“ → kommt nie wieder; der Eintrag im Profil bleibt.
import { useState } from 'react'
import { useInstallPrompt } from '../../hooks/useInstallPrompt'
import { useChatBusy } from '../../hooks/useChatBusy'
import { InstallSheet } from './InstallSheet'

const HINT_KEY = 'fs_install_hint_v1'

function hintSeen() {
  try { return localStorage.getItem(HINT_KEY) === '1' } catch { return true }   // ohne Speicher nicht zeigen
}
function markHintSeen() {
  try { localStorage.setItem(HINT_KEY, '1') } catch { /* ohne Speicher: Karte erscheint ohnehin nicht */ }
}

export function InstallCard({ conversationCount }) {
  const { mode, install } = useInstallPrompt()
  const busy = useChatBusy()
  const [closed, setClosed] = useState(hintSeen)
  const [sheet, setSheet] = useState(false)

  if (closed || busy || conversationCount < 2 || mode === 'installed' || mode === 'unsupported') return null

  const close = () => { markHintSeen(); setClosed(true) }
  return (
    <>
      <div className="bg-surface border border-[var(--color-border)] rounded-xl p-4 mb-4">
        <p className="text-[15px] text-ink font-medium mb-1">Friedensstifter auf den Startbildschirm</p>
        <p className="text-[13px] text-ink-2 leading-relaxed mb-3">Dann ist der Begleiter mit einem Tipp da, ohne Browser drumherum.</p>
        <div className="flex items-center gap-4">
          <button onClick={() => setSheet(true)} className="text-[14px] text-accent font-medium hover:underline">So geht's ›</button>
          <button onClick={close} className="text-[13px] text-ink-3 hover:text-ink-2">Später</button>
        </div>
      </div>
      {sheet && <InstallSheet mode={mode} install={install} onClose={() => { setSheet(false); close() }} />}
    </>
  )
}
