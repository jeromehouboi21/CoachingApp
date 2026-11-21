// Einstiegs-Rundgang (Paket R, Handoff 4.2): automatisches Erscheinen auf Heute.
// Entscheidung in src/lib/tourState.js, hier nur Zustand, Sitzung und das Speichern des Hakens.
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { createLogger } from '../lib/logger'
import { shouldShowTour } from '../lib/tourState'
import { useAuth } from './useAuth'

const logger = createLogger('WelcomeTour')
const SESSION_KEY = 'fs_tour_session_v1'

// Erste Route in der App-Shell nach dem Laden der App, je Nutzer (A1: Heute ist /home).
// Wer über einen Deep Link, „Daran weiterarbeiten“ oder ein laufendes Gespräch einsteigt,
// sieht den Rundgang in dieser Sitzung nicht.
let shellStart = null        // { userId, path }
let shownFallback = null     // userId, falls sessionStorage nicht nutzbar ist (dann: einmal pro Laden)

export function noteShellStart(userId, pathname) {
  if (!userId || shellStart?.userId === userId) return
  shellStart = { userId, path: pathname }
}

function startedOnToday(userId) {
  return shellStart?.userId === userId && shellStart.path === '/home'
}

function readShown(userId) {
  if (shownFallback === userId) return true
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === userId
  } catch {
    return false   // Storage gesperrt: es gilt nur die Modul-Variable oben
  }
}

function markShown(userId) {
  shownFallback = userId
  try {
    window.sessionStorage.setItem(SESSION_KEY, userId)
  } catch {
    // Storage gesperrt: shownFallback reicht für dieses Laden der App
    shownFallback = userId
  }
}

/**
 * @param {object} p
 * @param {number|null} p.conversationsHeld  geführte Gespräche; null = nicht ladbar → kein Rundgang
 * @param {boolean} p.ready                  Heute-Daten geladen
 * @param {boolean} p.blockingGateOpen       18+-Sheet über Heute offen (A6)
 */
export function useWelcomeTour({ conversationsHeld, ready, blockingGateOpen }) {
  const { user, profile, refreshProfile } = useAuth()
  const userId = user?.id ?? null
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (open || !ready || !userId || !profile) return
    const show = shouldShowTour({
      tourDismissedAt: profile.tour_dismissed_at ?? null,
      conversationsHeld,
      startedOnToday: startedOnToday(userId),
      shownThisSession: readShown(userId),
      blockingGateOpen,
    })
    if (show) {
      markShown(userId)
      setOpen(true)
    }
  }, [open, ready, userId, profile, conversationsHeld, blockingGateOpen])

  const close = useCallback(async ({ dismiss } = {}) => {
    setOpen(false)
    if (!dismiss) return
    const { error } = await supabase.rpc('set_tour_dismissed')
    if (error) {
      // Keine Meldung an den Nutzer: beim nächsten Start kommt der Rundgang noch einmal (harmlos)
      logger.warn('tour_dismiss_failed', { code: error.code ?? 'unknown' })
      return
    }
    logger.info('tour_dismissed', { via: 'checkbox' })
    refreshProfile()
  }, [refreshProfile])

  return { open, close }
}
