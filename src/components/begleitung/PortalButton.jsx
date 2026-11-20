// Paket Z (Handoff 5.3): „Abo verwalten“ → Stripe-Kundenportal (gehostet, Z-4).
// Kündigen, Zahlungsart ändern, Stufe oder Laufzeit wechseln passieren dort. Das Frontend entscheidet nichts.
// Ablauf: fetch mit Nutzer-Token → { url } → window.location.assign(url) auf billing.stripe.com.
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { functionHeaders, functionUrl } from '../../lib/functions'
import { createLogger } from '../../lib/logger'
import { checkMfaResponse } from '../../lib/mfa'

const logger = createLogger('PortalButton')

const ERROR_TEXT = {
  limit: 'Gerade kamen mehrere Versuche kurz hintereinander. Probier es in einer Stunde noch einmal.',
  failed: 'Die Abo-Verwaltung ließ sich gerade nicht öffnen. Probier es später noch einmal oder schreib mir.',
}

export function PortalButton({ variant = 'button' }) {
  const [state, setState] = useState('idle')   // idle | busy | limit | failed

  const open = async () => {
    setState('busy')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('no_session')
      const res = await fetch(functionUrl('create-portal-session'), {
        method: 'POST',
        headers: functionHeaders(session.access_token),
        body: '{}',
      })
      if (res.status === 429) { setState('limit'); return }
      if (!res.ok) {
        await checkMfaResponse(res)
        let code = 'unknown'
        try { code = (await res.json())?.error ?? code } catch { /* Antwort ohne JSON */ }
        logger.error('portal_request_failed', { status: res.status, code })
        setState('failed')
        return
      }
      const body = await res.json()
      if (typeof body?.url !== 'string' || !body.url.startsWith('https://billing.stripe.com/')) {
        logger.error('portal_request_failed', { status: res.status, code: 'invalid_url' })
        setState('failed')
        return
      }
      window.location.assign(body.url)
    } catch (err) {
      logger.error('portal_request_failed', { status: 0, errorType: err?.name ?? 'Error' })
      setState('failed')
    }
  }

  const label = state === 'busy' ? 'Abo-Verwaltung wird geöffnet …' : 'Abo verwalten'
  return (
    <div>
      {variant === 'link' ? (
        <button onClick={open} disabled={state === 'busy'} className="text-[14px] text-accent font-medium disabled:opacity-60">
          {label} →
        </button>
      ) : (
        <button
          onClick={open}
          disabled={state === 'busy'}
          className="w-full border border-[var(--color-border)] text-ink py-3 rounded-full font-medium disabled:opacity-60"
        >
          {label}
        </button>
      )}
      {(state === 'limit' || state === 'failed') && (
        <p role="alert" className="text-[13px] text-ink-2 mt-2 leading-relaxed">{ERROR_TEXT[state]}</p>
      )}
    </div>
  )
}
