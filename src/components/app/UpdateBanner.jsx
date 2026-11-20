// Paket P (P-2): ruhiger Hinweis auf eine neue Version. Neu geladen wird nur nach Tipp,
// automatisch nur bei 409 client_outdated (Event 'fs:client-outdated' aus useChat).
import { useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { createLogger } from '../../lib/logger'
import { useChatBusy } from '../../hooks/useChatBusy'

const logger = createLogger('pwa')
const CHECK_INTERVAL_MS = 60 * 60 * 1000   // stündlich nach neuer Version fragen
const RELOAD_FALLBACK_MS = 5000

export function UpdateBanner() {
  const busy = useChatBusy()                // Coach-Antwort läuft → nicht mitten im Stream neu laden
  const regRef = useRef(null)
  const applyingRef = useRef(false)
  const [applying, setApplying] = useState(false)

  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, reg) { regRef.current = reg ?? null },
    onRegisterError(e) { logger.warn('pwa_register_failed', { errorType: e?.name ?? 'Error' }) },
  })

  // Prüfen: stündlich und jedes Mal, wenn die App wieder in den Vordergrund kommt
  useEffect(() => {
    const check = () => {
      const reg = regRef.current
      if (!reg || !navigator.onLine) return   // offline: kein Fehler, nächster Versuch später
      reg.update().catch((e) => logger.info('pwa_update_check_failed', { errorType: e?.name ?? 'Error' }))
    }
    const id = setInterval(check, CHECK_INTERVAL_MS)
    const onVis = () => { if (!document.hidden) check() }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis) }
  }, [])

  const apply = async (source = 'user') => {
    if (applyingRef.current) return
    applyingRef.current = true
    setApplying(true)
    logger.info('pwa_update_applied', { source: source === 'auto' ? 'auto' : 'user' })
    const fallback = setTimeout(() => window.location.reload(), RELOAD_FALLBACK_MS)
    try {
      await updateServiceWorker(true)          // aktiviert den neuen Worker und lädt neu
    } catch (e) {
      clearTimeout(fallback)
      logger.warn('pwa_update_failed', { errorType: e?.name ?? 'Error' })
      window.location.reload()                 // notfalls einfach neu laden
    }
  }

  // 409 client_outdated: Weiterarbeiten geht ohnehin nicht → automatisch aktualisieren
  useEffect(() => {
    const onOutdated = () => apply('auto')
    window.addEventListener('fs:client-outdated', onOutdated)
    return () => window.removeEventListener('fs:client-outdated', onOutdated)
  })

  if (!needRefresh) return null
  return (
    <div role="status" className="fixed top-0 inset-x-0 z-[80] flex justify-center px-3" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}>
      <div className="max-w-lg w-full bg-surface border border-[var(--color-border)] rounded-xl shadow-sm px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[13px] text-ink-2 flex-1 min-w-[180px]">Es gibt eine neue Version von Friedensstifter.</span>
        <button type="button" onClick={() => apply('user')} disabled={busy || applying}
          className="text-[13px] font-medium text-white bg-accent px-3 py-1.5 rounded-full disabled:opacity-50">
          {applying ? 'Wird aktualisiert …' : 'Jetzt aktualisieren'}
        </button>
        <button type="button" onClick={() => setNeedRefresh(false)} className="text-[13px] text-ink-3 hover:text-ink-2">
          Später
        </button>
      </div>
    </div>
  )
}
