// supabase/functions/_shared/stripe.ts — Stripe-Client und feste Werte (Paket Z)
//
// npm:stripe@23.1.0 nutzt fest die API-Version 2026-10-28.endive. Keine eigene apiVersion setzen
// (Update nur bewusst, mit Test). Wichtig in dieser API-Version:
//   - Periodenende an den Positionen: subscription.items.data[].current_period_end
//   - Abo-ID einer Rechnung: invoice.parent.subscription_details.subscription
//   - Kündigung zum Periodenende: cancel_at_period_end (klassisch) ODER cancel_at (flexibel)
//   - Herabstufung zum Periodenende: Abo-Zeitplan (subscription.schedule)
// Fehlertexte von Stripe nie loggen (können Eingaben enthalten), nur type/code/statusCode.

import Stripe from 'npm:stripe@23.1.0';
import { HttpError } from './auth.ts';

export { Stripe };

export type Tier = 'begleitung' | 'intensiv';
export type Interval = 'month' | 'year';

export const TIERS: Tier[] = ['begleitung', 'intensiv'];
export const INTERVALS: Interval[] = ['month', 'year'];

/** Lookup-Keys der vier Preise (in Stripe als „Suchschlüssel“ eingetragen, J-Z1). */
export const LOOKUP_KEYS: Record<Tier, Record<Interval, string>> = {
  begleitung: { month: 'begleitung_monat', year: 'begleitung_jahr' },
  intensiv:   { month: 'intensiv_monat',   year: 'intensiv_jahr' },
};

/** Status, bei denen das Abo als laufend gilt (Z-9: past_due bleibt Begleitung). */
export const ACTIVE_STATUSES = ['active', 'trialing', 'past_due'];

export function paymentsEnabled(): boolean {
  return Deno.env.get('PAYMENTS_ENABLED') === '1';
}

export function intensivEnabled(): boolean {
  return Deno.env.get('INTENSIV_ENABLED') === '1';
}

export function siteUrl(): string {
  return Deno.env.get('SITE_URL') ?? 'https://app.friedensstifter.coach';
}

/** Stripe-Client oder null, wenn kein Schlüssel gesetzt ist. */
export function stripeClient(): Stripe | null {
  const key = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
  return key ? new Stripe(key) : null;
}

/** Nur Typ, Code und Status eines Stripe-Fehlers – nie die Meldung. */
export function stripeErrorInfo(err: unknown): { type: string; code: string | null; status: number | null } {
  const e = err as { type?: string; code?: string; statusCode?: number };
  return { type: e?.type ?? 'unknown', code: e?.code ?? null, status: e?.statusCode ?? null };
}

/** Stufe aus den Produkt-Metadaten (`tier`), Rückfall: Anfang des Lookup-Keys. */
// deno-lint-ignore no-explicit-any
export function tierFromPrice(price: any): Tier | null {
  const product = price?.product;
  const meta = typeof product === 'object' && product ? product.metadata?.tier : undefined;
  if (meta === 'begleitung' || meta === 'intensiv') return meta;
  const key: string = price?.lookup_key ?? '';
  if (key.startsWith('begleitung_')) return 'begleitung';
  if (key.startsWith('intensiv_')) return 'intensiv';
  return null;
}

/** Wirft 400, wenn der Wert nicht in der Liste steht. */
export function assertOneOf<T extends string>(value: unknown, allowed: T[], code: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) throw new HttpError(400, code);
  return value as T;
}

/** Unix-Sekunden → ISO-String (oder null). */
export function isoFromUnix(sec: unknown): string | null {
  return typeof sec === 'number' && sec > 0 ? new Date(sec * 1000).toISOString() : null;
}
