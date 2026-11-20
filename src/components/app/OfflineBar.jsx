// Paket P (P-5): ruhige Zeile, solange das Gerät offline ist. Es werden keine Inhalte offline gespeichert.
import { useOnline } from '../../hooks/useOnline'

export function OfflineBar() {
  const online = useOnline()
  if (online) return null
  return (
    <div role="status" className="fixed bottom-0 inset-x-0 z-[75] flex justify-center px-3 pointer-events-none"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)' }}>
      <p className="max-w-lg w-full bg-surface-2 border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-[13px] text-ink-2 text-center">
        Du bist gerade offline. Sobald die Verbindung zurück ist, geht es weiter.
      </p>
    </div>
  )
}
