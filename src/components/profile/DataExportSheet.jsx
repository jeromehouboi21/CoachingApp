import { useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import { functionHeaders, functionUrl } from '../../lib/functions'
import { createLogger } from '../../lib/logger'
import { checkMfaResponse } from '../../lib/mfa'

const logger = createLogger('DataExportSheet')

function fileNameFrom(res) {
  const match = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')
  if (match) return match[1]
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `friedensstifter-export-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`
}

// S-16 (Paket C, C-4): Selbstauskunft. Datei kommt von export-my-data und wird lokal gespeichert.
// Erfolg erst nach empfangener Datei; Fehler sichtbar, Logs nur mit Status/Code.
export function DataExportSheet({ onClose }) {
  const [state, setState] = useState('ask')   // ask | busy | done | limit | failed

  const create = async () => {
    setState('busy')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('no_session')
      const res = await fetch(functionUrl('export-my-data'), {
        method: 'POST',
        headers: functionHeaders(session.access_token),
      })
      if (res.status === 429) {
        setState('limit')
        return
      }
      if (!res.ok) {
        await checkMfaResponse(res)   // 403 mfa_required → Code-Abfrage (S-06b)
        let code = 'unknown'
        try { code = (await res.json())?.error ?? code } catch { /* Antwort ohne JSON */ }
        logger.error('export_request_failed', { status: res.status, code })
        setState('failed')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileNameFrom(res)
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setState('done')
    } catch (err) {
      logger.error('export_request_failed', { status: 0, errorType: err?.name ?? 'Error' })
      setState('failed')
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Meine Daten herunterladen">
      <div className="bg-surface rounded-t-2xl w-full max-w-lg p-6">
        <h3 className="font-display text-[22px] text-ink mb-2">Meine Daten herunterladen</h3>

        {state === 'done' ? (
          <>
            <p className="text-[14px] text-ink-2 leading-relaxed mb-5">Fertig. Die Datei wurde heruntergeladen.</p>
            <button onClick={onClose} className="w-full bg-accent text-white py-3 rounded-full font-medium hover:bg-accent-2 transition-colors">
              Schließen
            </button>
          </>
        ) : (
          <>
            <p className="text-[14px] text-ink-2 leading-relaxed mb-3">
              Du bekommst eine Datei mit allem, was die App über dich gespeichert hat: Gespräche, Spiegel, Akte, Innere Stimmen und auch die Notizen, die der Coach im Hintergrund führt.
            </p>
            <p className="text-[14px] text-ink-2 leading-relaxed mb-5">
              Die Datei ist im JSON-Format, damit du sie auch in anderen Programmen öffnen kannst. Sie enthält sehr persönliche Inhalte. Bewahre sie gut auf und teile sie nur, wenn du das wirklich möchtest.
            </p>
            {state === 'limit' && (
              <p role="alert" className="text-[13px] text-ink-2 bg-surface-2 rounded-lg px-4 py-3 mb-3">
                Du hast heute schon drei Exporte erstellt. Morgen geht es wieder.
              </p>
            )}
            {state === 'failed' && (
              <p role="alert" className="text-[13px] text-ink-2 bg-surface-2 rounded-lg px-4 py-3 mb-3">
                Das hat gerade nicht geklappt. Versuch es bitte später noch einmal.
              </p>
            )}
            <div className="flex flex-col gap-3">
              <button
                onClick={create}
                disabled={state === 'busy' || state === 'limit'}
                className="w-full bg-accent text-white py-3 rounded-full font-medium hover:bg-accent-2 transition-colors disabled:opacity-40"
              >
                {state === 'busy' ? 'Datei wird erstellt…' : 'Datei erstellen'}
              </button>
              <button onClick={onClose} className="text-[13px] text-ink-3 text-center">
                Abbrechen
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
