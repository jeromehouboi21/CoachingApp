// supabase/functions/stripe-webhook/index.ts — Stripe-Ereignisse (Paket Z, Handoff 4.2)
//
// AUSNAHME von der Sicherheitsregel (von Jerome mit Handoff v1 bestätigt): Diese Function ruft weder
// requireUser noch requireInternalCaller auf. Ihre Authentifizierung ist die Stripe-Signatur, und die
// wird als Erstes geprüft. Ohne gültige Signatur passiert nichts (400).
//
// Einzige Stelle, die profiles.plan für Abos setzt (service_role). Grundsätze:
//   - Idempotenz über stripe_events (event_id). Bereits verarbeitet → 200 ohne Arbeit.
//   - Immer frisch laden: das Abo wird bei jedem Ereignis neu von Stripe geholt.
//   - 2xx nur, wenn alles gespeichert ist. Sonst 500 → Stripe versucht es erneut.
//   - Ein Plan 'tester' wird nie überschrieben (Z-11).
// Logs nur mit IDs und Codes, keine Beträge, keine E-Mail, keine Stripe-Fehlertexte.

import { createLogger, describeError } from '../_shared/logger.ts';
import { createAdminClient, isUuid } from '../_shared/auth.ts';
import { ACTIVE_STATUSES, Stripe, isoFromUnix, stripeClient, stripeErrorInfo, tierFromPrice } from '../_shared/stripe.ts';

// deno-lint-ignore no-explicit-any
type Any = any;

class WebhookError extends Error {
  constructor(public code: string) { super(code); }
}

const HANDLED = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
]);

function plain(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function idOf(v: unknown): string | null {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object' && typeof (v as Any).id === 'string') return (v as Any).id;
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (req.method !== 'POST') return plain(405, { error: 'method_not_allowed' });

  const logger = createLogger('stripe-webhook');

  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
  const stripe = stripeClient();
  if (!secret || !stripe) {
    logger.error('stripe_webhook_not_configured', { hasSecret: !!secret, hasKey: !!stripe });
    return plain(503, { error: 'not_configured' });
  }

  // 1. Signatur prüfen – als Erstes, vor jedem DB-Zugriff
  const signature = req.headers.get('stripe-signature') ?? '';
  const raw = await req.text();
  if (!signature) {
    logger.warn('stripe_webhook_signature_invalid', { reason: 'missing' });
    return plain(400, { error: 'invalid_signature' });
  }
  let event: Any;
  try {
    event = await stripe.webhooks.constructEventAsync(
      raw, signature, secret, undefined, Stripe.createSubtleCryptoProvider(),
    );
  } catch {
    // Fehlermeldung bewusst verworfen
    logger.warn('stripe_webhook_signature_invalid', { reason: 'mismatch' });
    return plain(400, { error: 'invalid_signature' });
  }

  const admin = createAdminClient();
  const eventId: string = event.id;
  const type: string = event.type;

  // 2. Idempotenz
  const { error: insertError } = await admin.from('stripe_events')
    .upsert({ event_id: eventId, type }, { onConflict: 'event_id', ignoreDuplicates: true });
  if (insertError) {
    logger.error('stripe_webhook_failed', { type, eventId, code: insertError.code ?? 'event_insert' });
    return plain(500, { error: 'event_store_failed' });
  }
  const { data: stored, error: readError } = await admin.from('stripe_events')
    .select('processed_at').eq('event_id', eventId).maybeSingle();
  if (readError) {
    logger.error('stripe_webhook_failed', { type, eventId, code: readError.code ?? 'event_read' });
    return plain(500, { error: 'event_store_failed' });
  }
  if (stored?.processed_at) {
    logger.info('stripe_webhook_duplicate', { type, eventId });
    return plain(200, { received: true, duplicate: true });
  }

  // 3. Verarbeiten
  try {
    if (HANDLED.has(type)) {
      await handleEvent(stripe, admin, event, logger);
    } else {
      logger.info('stripe_webhook_ignored', { type, eventId });
    }

    const { error: doneError } = await admin.from('stripe_events')
      .update({ processed_at: new Date().toISOString() }).eq('event_id', eventId);
    if (doneError) throw new WebhookError(doneError.code ?? 'event_done');

    return plain(200, { received: true });
  } catch (err: unknown) {
    const code = err instanceof WebhookError ? err.code : (stripeErrorInfo(err).code ?? describeError(err).errorType ?? 'unknown');
    logger.error('stripe_webhook_failed', { type, eventId, code: String(code) });
    return plain(500, { error: 'processing_failed' });
  }
});

async function handleEvent(stripe: Stripe, admin: Any, event: Any, logger: Any): Promise<void> {
  const obj = event.data?.object ?? {};
  switch (event.type) {
    case 'checkout.session.completed': {
      if (obj.mode !== 'subscription') {
        logger.info('stripe_webhook_ignored', { type: event.type, eventId: event.id, reason: 'mode' });
        return;
      }
      const subId = idOf(obj.subscription);
      if (!subId) throw new WebhookError('session_without_subscription');
      await syncSubscription(stripe, admin, subId, obj.client_reference_id ?? null, logger);
      return;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await syncSubscription(stripe, admin, obj.id, obj.metadata?.user_id ?? null, logger);
      return;
    case 'invoice.paid': {
      const subId = idOf(obj.parent?.subscription_details?.subscription);
      if (!subId) {
        logger.info('stripe_webhook_ignored', { type: event.type, eventId: event.id, reason: 'no_subscription' });
        return;
      }
      const userId = await syncSubscription(stripe, admin, subId, null, logger);
      if (userId && obj.billing_reason === 'subscription_cycle') {
        logger.info('subscription_renewed', { userId, subscriptionId: subId });
      }
      return;
    }
    case 'invoice.payment_failed': {
      const customerId = idOf(obj.customer);
      const subId = idOf(obj.parent?.subscription_details?.subscription);
      const userId = customerId ? await userForCustomer(admin, customerId) : null;
      logger.warn('payment_failed', { userId, customerId, subscriptionId: subId });
      return;
    }
  }
}

async function userForCustomer(admin: Any, customerId: string): Promise<string | null> {
  const { data, error } = await admin.from('subscriptions')
    .select('user_id').eq('stripe_customer_id', customerId).maybeSingle();
  if (error) throw new WebhookError(error.code ?? 'customer_lookup');
  return data?.user_id ?? null;
}

/**
 * Nutzer zuordnen: zuerst über die gespeicherte Kunden-ID. Sonst über die mitgegebene Nutzer-ID,
 * aber nur, wenn das Profil existiert und dort noch kein ANDERER Kunde gespeichert ist.
 */
async function resolveUser(admin: Any, customerId: string, hint: unknown): Promise<string | null> {
  const known = await userForCustomer(admin, customerId);
  if (known) return known;
  if (!isUuid(hint)) return null;

  const { data: profile, error: profileError } = await admin.from('profiles')
    .select('id').eq('id', hint).maybeSingle();
  if (profileError) throw new WebhookError(profileError.code ?? 'profile_lookup');
  if (!profile) return null;

  const { data: row, error: rowError } = await admin.from('subscriptions')
    .select('stripe_customer_id').eq('user_id', hint).maybeSingle();
  if (rowError) throw new WebhookError(rowError.code ?? 'subscription_lookup');
  if (row && row.stripe_customer_id !== customerId) return null;
  return hint;
}

/** Holt das Abo frisch von Stripe und schreibt subscriptions + profiles.plan. Gibt die Nutzer-ID zurück. */
async function syncSubscription(
  stripe: Stripe, admin: Any, subscriptionId: string, hintUserId: unknown, logger: Any,
): Promise<string | null> {
  const sub: Any = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['items.data.price.product', 'schedule'],
  });
  const customerId = idOf(sub.customer);
  if (!customerId) throw new WebhookError('subscription_without_customer');

  const userId = await resolveUser(admin, customerId, hintUserId ?? sub.metadata?.user_id);
  if (!userId) {
    // Nach einer Kontolöschung (delete-account kündigt vorher) kommt das Ende des Abos ohne Nutzer an.
    // Das ist erwartet und kein Alarm.
    if (sub.status === 'canceled') {
      logger.info('stripe_webhook_orphan_ended', { customerId, subscriptionId });
      return null;
    }
    logger.error('stripe_webhook_unmatched', { customerId, subscriptionId });
    return null;
  }

  const { data: existing, error: existingError } = await admin.from('subscriptions')
    .select('stripe_subscription_id, status, tier').eq('user_id', userId).maybeSingle();
  if (existingError) throw new WebhookError(existingError.code ?? 'subscription_read');

  const status: string = sub.status;
  const isActive = ACTIVE_STATUSES.includes(status);
  const wasActive = !!existing && ACTIVE_STATUSES.includes(existing.status ?? '');

  // Ein älteres, beendetes Abo darf ein neueres laufendes nicht überschreiben (Reihenfolge der Ereignisse)
  if (existing?.stripe_subscription_id && existing.stripe_subscription_id !== sub.id && wasActive && !isActive) {
    logger.info('stripe_webhook_ignored', { reason: 'stale_subscription', userId, subscriptionId });
    return userId;
  }

  const items: Any[] = sub.items?.data ?? [];
  const price = items[0]?.price;
  const tier = tierFromPrice(price);
  const interval = price?.recurring?.interval === 'year' ? 'year' : price?.recurring?.interval === 'month' ? 'month' : null;
  if (!tier || !interval) throw new WebhookError('price_unknown');

  const periodEnds = items.map((i) => i?.current_period_end).filter((n) => typeof n === 'number');
  const periodEnd = periodEnds.length ? isoFromUnix(Math.max(...periodEnds)) : null;
  const pendingTier = await pendingTierFrom(stripe, sub.schedule, tier);

  const isNew = !existing?.stripe_subscription_id || existing.stripe_subscription_id !== sub.id
    || existing.status === 'canceled';

  const { error: upsertError } = await admin.from('subscriptions').upsert({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    tier,
    billing_interval: interval,
    status,
    quota_anchor: isoFromUnix(sub.start_date),       // bleibt bei einem Stufenwechsel gleich
    current_period_end: periodEnd,
    cancel_at_period_end: !!sub.cancel_at_period_end,
    cancel_at: isoFromUnix(sub.cancel_at),
    pending_tier: pendingTier,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (upsertError?.code === '23503' && status === 'canceled') {
    // Konto wurde gerade gelöscht (delete-account kündigt vorher) – Profil existiert nicht mehr
    logger.info('stripe_webhook_orphan_ended', { customerId, subscriptionId });
    return null;
  }
  if (upsertError) throw new WebhookError(upsertError.code ?? 'subscription_upsert');

  // Plan setzen (Z-9: past_due bleibt Begleitung), Tester nie überschreiben (Z-11)
  const { data: profile, error: profileError } = await admin.from('profiles')
    .select('plan').eq('id', userId).maybeSingle();
  if (profileError || !profile) throw new WebhookError(profileError?.code ?? 'profile_missing');
  if (profile.plan === 'tester') {
    logger.info('subscription_tester_unchanged', { userId, subscriptionId: sub.id, status });
  } else {
    const target = isActive ? 'premium' : 'free';
    if (profile.plan !== target) {
      const { error: planError } = await admin.from('profiles').update({ plan: target }).eq('id', userId);
      if (planError) throw new WebhookError(planError.code ?? 'plan_update');
    }
  }

  const ids = { userId, customerId, subscriptionId: sub.id };
  if (isActive && (isNew || !wasActive)) logger.info('subscription_started', { ...ids, tier, interval });
  else if (isActive && existing?.tier && existing.tier !== tier) logger.info('subscription_changed', { ...ids, fromTier: existing.tier, toTier: tier });
  else if (!isActive && wasActive) logger.info('subscription_ended', { ...ids, status });

  return userId;
}

/** Geplante Herabstufung (Z-6): Stufe der nächsten Phase des Abo-Zeitplans, wenn sie abweicht. */
async function pendingTierFrom(stripe: Stripe, schedule: unknown, currentTier: string): Promise<string | null> {
  if (!schedule || typeof schedule !== 'object') return null;
  const now = Math.floor(Date.now() / 1000);
  const phases: Any[] = (schedule as Any).phases ?? [];
  const next = phases.find((p) => typeof p?.start_date === 'number' && p.start_date > now);
  const nextPrice = next?.items?.[0]?.price;
  if (!nextPrice) return null;
  let priceObj: Any = nextPrice;
  if (typeof nextPrice === 'string') {
    priceObj = await stripe.prices.retrieve(nextPrice, { expand: ['product'] });
  } else if (typeof nextPrice.product === 'string') {
    priceObj = await stripe.prices.retrieve(nextPrice.id, { expand: ['product'] });
  }
  const tier = tierFromPrice(priceObj);
  return tier && tier !== currentTier ? tier : null;
}
