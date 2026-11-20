// supabase/functions/create-checkout-session/index.ts
// Stripe Checkout (gehostete Bezahlseite) für die Begleitung – GERÜST, standardmäßig AUS.
//
// Ablauf: Frontend ruft POST mit Nutzer-JWT → Function erzeugt eine Checkout Session →
// Antwort { url } → Frontend leitet per window.location auf checkout.stripe.com weiter.
//
// Sperren (fail-closed):
//   1. requireUser (inkl. zweiter Faktor, falls eingerichtet)
//   2. Secret PAYMENTS_ENABLED=1 – sonst 403 payments_disabled (Gegenstück zu PAYMENTS_ENABLED in legalTexts.js)
//   3. requireConsent (Zustimmung + Vereinbarung v2.0)
//   4. Rate-Limit checkout (fail-closed)
//   5. STRIPE_SECRET_KEY und STRIPE_PRICE_ID gesetzt – sonst 503 checkout_not_configured
//
// Bewusst NICHT enthalten (eigene Tranche, siehe STRIPE_INTEGRATION_TODO.md):
//   Webhook, plan = 'premium' setzen, Kündigung/Kundenportal, Frontend-Button.
// Es werden keine E-Mail-Adresse und kein Name an Stripe übergeben, nur die Nutzer-ID
// als client_reference_id (für die spätere Zuordnung im Webhook).

import Stripe from 'npm:stripe@23.1.0';
import { createLogger, describeError } from '../_shared/logger.ts';
import { HttpError, requireUser, errorResponse, jsonResponse } from '../_shared/auth.ts';
import { RATE_LIMITS, enforceRateLimit, RateLimitError, rateLimitResponse } from '../_shared/rateLimit.ts';
import { requireConsent } from '../_shared/consent.ts';
import { corsHeaders } from '../_shared/cors.ts';

const CORS_HEADERS = corsHeaders('POST, OPTIONS');

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, CORS_HEADERS, 405);
  }

  let logger = createLogger('create-checkout-session');

  try {
    const { user, admin } = await requireUser(req);
    logger = createLogger('create-checkout-session', undefined, user.id);

    if (Deno.env.get('PAYMENTS_ENABLED') !== '1') {
      logger.info('checkout_disabled');
      throw new HttpError(403, 'payments_disabled');
    }

    await requireConsent(admin, user.id, logger);
    await enforceRateLimit(admin, user.id, RATE_LIMITS.checkout, logger, false);

    const secretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
    const priceId = Deno.env.get('STRIPE_PRICE_ID') ?? '';
    if (!secretKey || !priceId) {
      logger.error('checkout_not_configured', { hasKey: !!secretKey, hasPrice: !!priceId });
      throw new HttpError(503, 'checkout_not_configured');
    }

    // API-Version bewusst nicht gesetzt (Stripe-Konto-Standard)
    const stripe = new Stripe(secretKey);
    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://app.friedensstifter.coach';

    // Begleitung = wiederkehrende Zahlung → subscription (payment_method_collection nur dort)
    const mode = 'subscription';

    // Werte aus Checkout Studio (fixed_by_ui) unverändert übernehmen.
    // deno-lint-ignore no-explicit-any
    const params: any = {
      ui_mode: 'hosted_page',
      billing_address_collection: 'auto',
      phone_number_collection: { enabled: false },
      automatic_tax: { enabled: false },
      allow_promotion_codes: false,
      submit_type: 'auto',
      integration_identifier: 'hosted_web_0001',
      origin_context: 'web',
      mode,
      // Platzhalter (sample_only) → STRIPE_INTEGRATION_TODO.md
      success_url: `${siteUrl}/begleitung?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/begleitung?checkout=cancel`,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
    };
    if (mode === 'subscription') {
      params.payment_method_collection = 'always';
    }

    let session: { id: string; url: string | null };
    try {
      session = await stripe.checkout.sessions.create(params);
    } catch (err: unknown) {
      // Keine Stripe-Fehlermeldung loggen (kann Eingaben enthalten) – nur Typ und Code
      const e = err as { type?: string; code?: string; statusCode?: number };
      logger.error('checkout_session_failed', { type: e?.type ?? 'unknown', code: e?.code ?? null, status: e?.statusCode ?? null });
      throw new HttpError(502, 'checkout_failed');
    }

    if (!session.url) {
      logger.error('checkout_session_failed', { type: 'missing_url' });
      throw new HttpError(502, 'checkout_failed');
    }

    logger.info('checkout_session_created', { mode });
    return jsonResponse({ url: session.url }, CORS_HEADERS);

  } catch (error: unknown) {
    if (error instanceof RateLimitError) return rateLimitResponse(error, CORS_HEADERS);
    if (error instanceof HttpError) {
      if (error.status >= 500) logger.error('Request failed', { code: error.code, status: error.status });
      return errorResponse(error, CORS_HEADERS);
    }
    logger.error('Unhandled error', describeError(error));
    return errorResponse(error, CORS_HEADERS);
  }
});
