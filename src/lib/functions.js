// src/lib/functions.js — gemeinsame Bausteine für Edge-Function-Aufrufe (S-09, Paket C)
//
// Jeder Aufruf läuft fest in Frankfurt (eu-central-1): fetch-Aufrufe schicken den Header
// x-region, supabase.functions.invoke bekommt die Option region: INVOKE_REGION.
// Die Functions erlauben x-region in ihren CORS-Headern (_shared/cors.ts).
import { FunctionRegion } from '@supabase/supabase-js'

export const FUNCTIONS_REGION = 'eu-central-1'
export const INVOKE_REGION = FunctionRegion.EuCentral1

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export function functionUrl(name) {
  return `${SUPABASE_URL}/functions/v1/${name}`
}

export function functionHeaders(accessToken, extra = {}) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    apikey: ANON_KEY,
    'x-region': FUNCTIONS_REGION,
    ...extra,
  }
}
