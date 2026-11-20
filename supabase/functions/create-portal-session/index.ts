// supabase/functions/create-portal-session/index.ts — Stripe-Kundenportal (Paket Z, Handoff 4.3)
//
// Kündigen, Zahlungsart ändern, Stufe oder Laufzeit wechseln laufen im gehosteten Kundenportal (Z-4).
// Antwort { url } → Frontend leitet auf billing.stripe.com weiter.
// Sperren: requireUser, PAYMENTS_ENABLED=1, Rate-Limit portal (fail-closed), eigener Stripe-Kunde.

import { createLogger, describeError } from '../_shared/logger.ts';
import { HttpError, requireUser, errorResponse, jsonResponse } from '../_shared/auth.ts';
import { RATE_LIMITS, enforceRateLimit, RateLimitError, rateLimitResponse } from '../_shared/rateLimit.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { paymentsEnabled, siteUrl, stripeClient, stripeErrorInfo } from '../_shared/stripe.ts';

const CORS_HEADERS = corsHeaders('POST, OPTIONS');

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  let logger = createLogger('create-portal-session');

  try {
    const { user, admin } = await requireUser(req);
    logger = createLogger('create-portal-session', undefined, user.id);
    if (req.method !== 'POST') throw new HttpError(405, 'method_not_allowed');

    if (!paymentsEnabled()) {
      logger.info('portal_disabled');
      throw new HttpError(403, 'payments_disabled');
    }
    await enforceRateLimit(admin, user.id, RATE_LIMITS.portal, logger, false);

    const { data: sub, error: subError } = await admin.from('subscriptions')
      .select('stripe_customer_id').eq('user_id', user.id).maybeSingle();
    if (subError) {
      logger.error('portal_session_failed', { step: 'read', code: subError.code ?? 'unknown' });
      throw new HttpError(500, 'portal_failed');
    }
    if (!sub?.stripe_customer_id) throw new HttpError(404, 'no_customer');

    const stripe = stripeClient();
    if (!stripe) {
      logger.error('portal_session_failed', { step: 'config', type: 'missing_key' });
      throw new HttpError(503, 'portal_not_configured');
    }

    let url: string | null = null;
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: sub.stripe_customer_id,
        return_url: `${siteUrl()}/profile`,
      });
      url = session.url ?? null;
    } catch (err: unknown) {
      logger.error('portal_session_failed', { step: 'session', ...stripeErrorInfo(err) });
      throw new HttpError(502, 'portal_failed');
    }
    if (!url) {
      logger.error('portal_session_failed', { step: 'session', type: 'missing_url' });
      throw new HttpError(502, 'portal_failed');
    }

    logger.info('portal_session_created');
    return jsonResponse({ url }, CORS_HEADERS);

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
