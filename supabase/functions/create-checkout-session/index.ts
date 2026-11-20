// supabase/functions/create-checkout-session/index.ts
// Stripe Checkout (gehostete Bezahlseite) für die Begleitung (Paket Z, Handoff 4.1).
//
// Ablauf: Frontend ruft POST { tier, interval } mit Nutzer-JWT → Function ermittelt den Preis über
// den Lookup-Key, legt bei Bedarf den Stripe-Kunden an und erzeugt eine Checkout Session →
// Antwort { url } → Frontend leitet auf checkout.stripe.com weiter.
// Freigeschaltet wird hier NICHTS. plan setzt ausschließlich stripe-webhook.
//
// Sperren (fail-closed):
//   1. requireUser (inkl. zweiter Faktor, falls eingerichtet)
//   2. Secret PAYMENTS_ENABLED=1 – sonst 403 payments_disabled
//   3. requireConsent (Zustimmung + Vereinbarung v2.0)
//   4. Rate-Limit checkout (fail-closed)
//   5. tier/interval geprüft; intensiv nur mit INTENSIV_ENABLED=1 (403 tier_unavailable)
//   6. tester → 409 not_applicable (Z-11); laufendes Abo → 409 already_subscribed
//   7. STRIPE_SECRET_KEY und Preis vorhanden – sonst 503 checkout_not_configured
//
// An Stripe gehen (Z-8): Nutzer-ID (client_reference_id, Metadaten) und E-Mail beim Anlegen des
// Kunden. Kein Name, keine Inhalte. Die E-Mail wird nicht geloggt.

import { createLogger, describeError } from '../_shared/logger.ts';
import { HttpError, requireUser, errorResponse, jsonResponse, readJsonBody } from '../_shared/auth.ts';
import { RATE_LIMITS, enforceRateLimit, RateLimitError, rateLimitResponse } from '../_shared/rateLimit.ts';
import { requireConsent } from '../_shared/consent.ts';
import { corsHeaders } from '../_shared/cors.ts';
import {
  ACTIVE_STATUSES, INTERVALS, LOOKUP_KEYS, TIERS, assertOneOf, intensivEnabled, paymentsEnabled,
  siteUrl, stripeClient, stripeErrorInfo,
} from '../_shared/stripe.ts';

const CORS_HEADERS = corsHeaders('POST, OPTIONS');

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  let logger = createLogger('create-checkout-session');

  try {
    const { user, admin } = await requireUser(req);
    logger = createLogger('create-checkout-session', undefined, user.id);
    if (req.method !== 'POST') throw new HttpError(405, 'method_not_allowed');

    if (!paymentsEnabled()) {
      logger.info('checkout_disabled');
      throw new HttpError(403, 'payments_disabled');
    }

    await requireConsent(admin, user.id, logger);
    await enforceRateLimit(admin, user.id, RATE_LIMITS.checkout, logger, false);

    const body = await readJsonBody(req, 1024);
    const tier = assertOneOf(body.tier, TIERS, 'invalid_tier');
    const interval = assertOneOf(body.interval, INTERVALS, 'invalid_interval');
    if (tier === 'intensiv' && !intensivEnabled()) throw new HttpError(403, 'tier_unavailable');

    // Plan und bestehendes Abo prüfen
    const { data: profile, error: profileError } = await admin.from('profiles')
      .select('plan').eq('id', user.id).maybeSingle();
    if (profileError || !profile) {
      logger.error('checkout_profile_failed', { code: profileError?.code ?? 'not_found' });
      throw new HttpError(500, 'profile_check_failed');
    }
    if (profile.plan === 'tester') throw new HttpError(409, 'not_applicable');

    const { data: sub, error: subError } = await admin.from('subscriptions')
      .select('stripe_customer_id, status').eq('user_id', user.id).maybeSingle();
    if (subError) {
      logger.error('checkout_subscription_read_failed', { code: subError.code ?? 'unknown' });
      throw new HttpError(500, 'subscription_check_failed');
    }
    if (sub && ACTIVE_STATUSES.includes(sub.status ?? '')) throw new HttpError(409, 'already_subscribed');

    const stripe = stripeClient();
    if (!stripe) {
      logger.error('checkout_not_configured', { hasKey: false });
      throw new HttpError(503, 'checkout_not_configured');
    }

    // Preis über den Lookup-Key (das Secret STRIPE_PRICE_ID entfällt)
    const lookupKey = LOOKUP_KEYS[tier][interval];
    let priceId: string | undefined;
    try {
      const prices = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
      priceId = prices.data[0]?.id;
    } catch (err: unknown) {
      logger.error('checkout_session_failed', { step: 'price', ...stripeErrorInfo(err) });
      throw new HttpError(502, 'checkout_failed');
    }
    if (!priceId) {
      logger.error('checkout_not_configured', { hasKey: true, lookupKey });
      throw new HttpError(503, 'checkout_not_configured');
    }

    // Kunde: wiederverwenden oder anlegen und SOFORT speichern, erst dann die Session
    let customerId: string | undefined = sub?.stripe_customer_id ?? undefined;
    if (!customerId) {
      const email = typeof user.email === 'string' && user.email ? user.email : undefined;
      try {
        const customer = await stripe.customers.create(
          { email, metadata: { user_id: user.id } },
          { idempotencyKey: `customer-${user.id}` },
        );
        customerId = customer.id;
      } catch (err: unknown) {
        logger.error('checkout_session_failed', { step: 'customer', ...stripeErrorInfo(err) });
        throw new HttpError(502, 'checkout_failed');
      }
      const { error: saveError } = await admin.from('subscriptions').upsert(
        { user_id: user.id, stripe_customer_id: customerId, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      );
      if (saveError) {
        logger.error('checkout_session_failed', { step: 'customer_save', code: saveError.code ?? 'unknown' });
        throw new HttpError(500, 'checkout_failed');
      }
      logger.info('stripe_customer_created', { customerId });
    }

    const base = siteUrl();
    // Werte aus Checkout Studio (fixed_by_ui) unverändert übernehmen.
    // Offen für den Anwalt (Handoff 7.3, Frage 16): consent_collection / custom_text.
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
      mode: 'subscription',
      payment_method_collection: 'always',
      success_url: `${base}/begleitung?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/begleitung?checkout=cancel`,
      line_items: [{ price: priceId, quantity: 1 }],
      customer: customerId,
      client_reference_id: user.id,
      subscription_data: { metadata: { user_id: user.id } },
    };

    let session: { id: string; url: string | null };
    try {
      session = await stripe.checkout.sessions.create(params);
    } catch (err: unknown) {
      logger.error('checkout_session_failed', { step: 'session', ...stripeErrorInfo(err) });
      throw new HttpError(502, 'checkout_failed');
    }

    if (!session.url) {
      logger.error('checkout_session_failed', { step: 'session', type: 'missing_url' });
      throw new HttpError(502, 'checkout_failed');
    }

    logger.info('checkout_session_created', { tier, interval });
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
