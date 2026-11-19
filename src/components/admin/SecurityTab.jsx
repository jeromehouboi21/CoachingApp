import { useEffect, useState } from 'react'

// Admin-Tab „Sicherheit“ (S-22): letzte Alarme, Wochenübersicht, letzter Monitor-Lauf.
// Daten kommen aus admin-security (requireAdmin, aal2) und enthalten nur Zähler und Codes.
const formatDate = (iso) => new Date(iso).toLocaleString('de-DE', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
})

const RUN_STALE_MS = 2 * 3600_000 // Monitor läuft stündlich; älter als 2 Std. = auffällig

export function SecurityTab({ adminGet }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      try {
        const res = await adminGet('admin-security')
        if (active && res) { setData(res); setError(null) }
      } catch {
        if (active) setError('Die Sicherheitsübersicht konnte gerade nicht geladen werden.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  if (loading) return <p className="text-ink-3 text-[14px] mt-4">Lädt …</p>
  if (error) return <p className="text-[14px] text-[var(--color-coral)] mt-4">{error}</p>
  if (!data) return null

  const { alerts = [], digest, lastRunAt, labels = {} } = data
  // Ohne bisherigen Lauf (z. B. direkt nach dem Deploy) ist das kein Fehler; rot nur, wenn der letzte Lauf zu alt ist
  const runStale = !!lastRunAt && Date.now() - new Date(lastRunAt).getTime() > RUN_STALE_MS
  const counts = digest?.details?.counts ?? {}

  return (
    <div className="mt-4 flex flex-col gap-6">
      <p className={`text-[13px] ${runStale ? 'text-[var(--color-coral)]' : 'text-ink-3'}`}>
        {lastRunAt
          ? <>Letzter Monitor-Lauf: {formatDate(lastRunAt)}</>
          : 'Noch kein Monitor-Lauf. Der erste kommt zur nächsten vollen Stunde, 7 Minuten danach.'}
        {runStale && ' – der stündliche Lauf ist überfällig. Cron-Job security-monitor prüfen.'}
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-[18px] text-ink">Alarme</h2>
        {alerts.length === 0 && <p className="text-ink-3 text-[14px]">Keine Auffälligkeiten.</p>}
        {alerts.map((a) => (
          <div key={a.id} className="bg-surface border border-[var(--color-border)] rounded-xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[14px] font-medium text-ink">{a.label}</p>
                <p className="text-[12px] text-ink-3">
                  {formatDate(a.created_at)} · {a.rule}{a.kind === 'alert' ? ` · ${a.count} Ereignisse` : ''}
                </p>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${a.mailed ? 'bg-accent-light text-accent' : 'bg-surface-2 text-ink-3'}`}>
                {a.mailed ? 'Mail gesendet' : `keine Mail${a.mail_error ? ` (${a.mail_error})` : ''}`}
              </span>
            </div>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-[18px] text-ink">Wochenübersicht</h2>
        {!digest && <p className="text-ink-3 text-[14px]">Noch keine Wochenübersicht (kommt montags um 07:07 Uhr).</p>}
        {digest && (
          <div className="bg-surface border border-[var(--color-border)] rounded-xl p-4">
            <p className="text-[12px] text-ink-3 mb-3">
              {formatDate(digest.window_start)} – {formatDate(digest.window_end)}
            </p>
            <div className="flex flex-col gap-1">
              {Object.entries(counts).map(([rule, n]) => (
                <div key={rule} className="flex justify-between text-[13px]">
                  <span className="text-ink-2">{labels[rule] ?? rule}</span>
                  <span className={n > 0 ? 'text-ink font-medium' : 'text-ink-3'}>{n}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex flex-col gap-1 text-[13px] text-ink-2">
              <span>Alarme in der Woche: {digest.details?.alerts_7d ?? 0}</span>
              <span>Krisenereignisse neu: {digest.details?.crisis_new_7d ?? 'nicht verfügbar'} · ungesichtet: {digest.details?.crisis_unreviewed ?? 'nicht verfügbar'}</span>
              <span>Konten ohne Anmeldung seit 24 Monaten: {digest.details?.inactive_accounts_24m ?? 'nicht verfügbar'}</span>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
