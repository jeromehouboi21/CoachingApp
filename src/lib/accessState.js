// src/lib/accessState.js — Kennenlernen · Ruhemodus · Begleitung (U4)
// Die Regeln stehen nur in der Datenbank (access_state_for, Migration 038). Das Frontend fragt sie
// über die RPC get_access_state ab und zeigt nur an – durchgesetzt wird im Server (chat, consume_session).
import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { createLogger } from './logger'
import { reportIfMfaRpcError } from './mfa'

const logger = createLogger('accessState')

/** { phase: 'kennenlernen'|'ruhemodus'|'begleitung', starts_used, starts_limit|null, can_start, cap|null } */
export async function loadAccessState() {
  const { data, error } = await supabase.rpc('get_access_state')
  if (error) {
    reportIfMfaRpcError(error)
    logger.warn('access_state_failed', { code: error.code ?? 'unknown' })
    return { state: null, error: true }
  }
  return { state: data ?? null, error: false }
}

export function useAccessState() {
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const refresh = useCallback(async () => {
    const res = await loadAccessState()
    setState(res.state)
    setError(res.error)
    setLoading(false)
    return res.state
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { access: state, loading, error, refresh }
}

/** Noch genau ein Kennenlern-Start übrig (Übergangstext 1, UX 5.4). */
export function isLastTrialStart(access) {
  return access?.phase === 'kennenlernen'
    && typeof access.starts_limit === 'number'
    && access.starts_limit - access.starts_used === 1
}

// „Einmalig“ pro Gerät und Konto (E-U4-9). localStorage kann fehlen (privater Modus) → dann einfach zeigen.
export function seenOnce(key, userId) {
  try { return localStorage.getItem(`${key}:${userId}`) === '1' } catch { return false }
}
export function markSeen(key, userId) {
  try { localStorage.setItem(`${key}:${userId}`, '1') } catch { /* ohne Speicher erscheint der Text erneut */ }
}

export const TRIAL_LAST_HINT_KEY = 'fs_trial_last_hint_v1'
export const TRIAL_END_CARD_KEY = 'fs_trial_end_card_v1'

export const COACHING_CONTACT_URL = 'https://www.friedensstifter.coach/contact/'
