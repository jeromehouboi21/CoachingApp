// Einstiegs-Rundgang (Paket R): Entscheidet, ob der Rundgang automatisch erscheint.
// Reine Funktion ohne Seiteneffekte und ohne Imports (Test: tourState.test.js, `npm test`).

// Gilt für alle Pläne, hängt nicht an session_limit (Handoff 4.1)
export const TOUR_MAX_CONVERSATIONS = 3

export function shouldShowTour({
  tourDismissedAt,     // profiles.tour_dismissed_at oder null
  conversationsHeld,   // geführte Gespräche (message_count >= 3, wie todayState.js)
  startedOnToday,      // erste Route in der App-Shell nach dem Laden war /home
  shownThisSession,    // in dieser Sitzung schon gezeigt
  blockingGateOpen,    // Sperre über Heute offen (18+-Sheet)
}) {
  if (tourDismissedAt) return false
  if (!Number.isFinite(conversationsHeld)) return false   // Zahl unbekannt (Ladefehler) → nicht zeigen
  if (conversationsHeld >= TOUR_MAX_CONVERSATIONS) return false
  if (!startedOnToday) return false
  if (shownThisSession) return false
  if (blockingGateOpen) return false
  return true
}
