// src/content/plans.js — Preise und Stufen der Begleitung, NUR ANZEIGE (Paket Z, Z-10).
// Abgerechnet wird ausschließlich, was in Stripe hinterlegt ist (Lookup-Keys, siehe
// supabase/functions/_shared/stripe.ts). Bei Test J-Z2 mit Stripe abgleichen.
// Die Nachrichtengrenzen stehen verbindlich in quota_limit_for() (Migration 042), hier nur zur Anzeige.

export const PLANS = [
  {
    tier: 'begleitung',
    name: 'Begleitung',
    messagesPerMonth: 150,
    price: { month: '9,90 €', year: '99 €' },
  },
  {
    tier: 'intensiv',
    name: 'Begleitung intensiv',
    messagesPerMonth: 800,
    price: { month: '19,90 €', year: '199 €' },
  },
]

export const INTERVAL_LABEL = { month: 'Monat', year: 'Jahr' }

/** ISO-Datum → „14.04.“ (für Hinweise ohne Jahr) */
export function shortDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' })
}

/** ISO-Datum → „14.04.2027“ (Profil) */
export function longDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin' })
}
