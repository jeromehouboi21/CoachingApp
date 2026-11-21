// T1 Buch-Seite (Handoff 4.4): Buch-Status lesen und über die RPC set_book_status speichern.
// Kein optimistisches „Gespeichert“: erst nach erfolgreicher RPC und neu geladenem Profil.
import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'
import { createLogger } from '../lib/logger'
import { reportIfMfaRpcError } from '../lib/mfa'
import { isValidBookStatus } from '../lib/bookStatus'
import { useAuth } from './useAuth'

const logger = createLogger('BookStatus')

export function useBookStatus() {
  const { profile, refreshProfile } = useAuth()
  const [state, setState] = useState('idle')   // 'idle' | 'saving' | 'saved' | 'error'

  const save = useCallback(async (status, progress = null) => {
    if (!isValidBookStatus(status, progress)) {
      logger.warn('book_status_invalid_input')
      return false
    }
    setState('saving')
    let error = null
    try {
      const res = await supabase.rpc('set_book_status', { p_status: status, p_progress: progress })
      error = res.error
    } catch (err) {
      error = { code: err?.name ?? 'network' }
    }
    if (error) {
      reportIfMfaRpcError(error)
      logger.warn('book_status_failed', { code: error.code ?? 'unknown' })
      setState('error')
      return false
    }
    // A10 (Jerome): Status und Teil mitloggen, keine IDs in den Event-Daten
    logger.info('book_status_set', status === 'reading' ? { status, progress } : { status })
    await refreshProfile()
    setState('saved')
    return true
  }, [refreshProfile])

  return {
    status: profile?.book_status ?? null,
    progress: profile?.book_progress ?? null,
    state,
    setState,
    save,
  }
}
