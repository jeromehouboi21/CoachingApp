// Stripe Checkout (Gerüst): Button „Weiter zur Bezahlung“ und Hinweis nach der Rückkehr.
// Erscheint nur mit PAYMENTS_ENABLED (src/content/legalTexts.js); der Server sperrt zusätzlich
// über das Secret PAYMENTS_ENABLED (create-checkout-session). Das Frontend entscheidet nichts.
//
// Ablauf: fetch mit Nutzer-Token → { url } → window.location.assign(url) auf checkout.stripe.com.
// Keine Stripe-Skripte im Frontend (gehostete Bezahlseite, CSP bleibt unverändert).
// Texte sind Vorschläge (UI), keine Rechtstexte – Bestell- und Widerrufstexte kommen aus legalTexts.js.
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { functionHeaders, functionUrl } from '../../lib/functions'
import { createLogger } from '../../lib/logger'
import { checkMfaResponse } from '../../lib/mfa'

const logger = createLogger('CheckoutButton')

const RETURN_TEXT = {
  success: 'Danke. Sobald Stripe die Zahlung bestätigt, ist deine Begleitung aktiv. Das dauert meist nur einen Moment.',
  cancel: 'Die Bezahlung wurde abgebrochen. Es wurde nichts berechnet.',
}

const ERROR_TEXT = {
  limit: 'Gerade kamen mehrere Versuche kurz hintereinander. Probier es in einer Stunde noch einmal.',
  failed: 'Die Bezahlseite ließ sich gerade nicht öffnen. Probier es später noch einmal oder schreib mir.',
}

/** Liest ?checkout=success|cancel einmal aus und entfernt den Parameter (inkl. session_id) aus der Adresse. */
export function useCheckoutReturn() {
  const location = useLocation()
  const navigate = useNavigate()
  const [result, setResult] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const value = params.get('checkout')
    if (value !== 'success' && value !== 'cancel') return
    setResult(value)
    navigate(location.pathname, { replace: true })
  }, [location.pathname, location.search, navigate])

  return result
}

export function CheckoutReturnNotice({ result }) {
  if (!result) return null
  return (
    <div role="status" className="bg-surface border border-[var(--color-border)] rounded-xl p-4 mb-4">
      <p className="text-[14px] text-ink-2 leading-relaxed">{RETURN_TEXT[result]}</p>
    </div>
  )
}

export function CheckoutButton() {
  const [state, setState] = useState('idle')   // idle | busy | limit | failed

  const start = async () => {
    setState('busy')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('no_session')
      const res = await fetch(functionUrl('create-checkout-session'), {
        method: 'POST',
        headers: functionHeaders(session.access_token),
        body: '{}',
      })
      if (res.status === 429) {
        setState('limit')
        return
      }
      if (!res.ok) {
        await checkMfaResponse(res)   // 403 mfa_required → Code-Abfrage (S-06b)
        let code = 'unknown'
        try { code = (await res.json())?.error ?? code } catch { /* Antwort ohne JSON */ }
        logger.error('checkout_request_failed', { status: res.status, code })
        setState('failed')
        return
      }
      const body = await res.json()
      if (typeof body?.url !== 'string' || !body.url.startsWith('https://checkout.stripe.com/')) {
        logger.error('checkout_request_failed', { status: res.status, code: 'invalid_url' })
        setState('failed')
        return
      }
      window.location.assign(body.url)   // Zustand bleibt 'busy' bis zur Weiterleitung
    } catch (err) {
      logger.error('checkout_request_failed', { status: 0, errorType: err?.name ?? 'Error' })
      setState('failed')
    }
  }

  return (
    <div>
      <button
        onClick={start}
        disabled={state === 'busy'}
        className="w-full bg-accent text-white py-3 rounded-full font-medium hover:bg-accent-2 transition-colors disabled:opacity-60"
      >
        {state === 'busy' ? 'Bezahlseite wird geöffnet …' : 'Weiter zur Bezahlung'}
      </button>
      <p className="text-[12px] text-ink-3 mt-2 leading-relaxed">
        Bezahlt wird auf einer sicheren Seite von Stripe. Du kannst dort jederzeit zurück, ohne dass etwas berechnet wird.
      </p>
      {(state === 'limit' || state === 'failed') && (
        <p role="alert" className="text-[13px] text-ink-2 mt-3 leading-relaxed">{ERROR_TEXT[state]}</p>
      )}
    </div>
  )
}
