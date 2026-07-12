import { createLogger } from '../lib/logger'

const logger = createLogger('useStreak')

export function useStreak() {
  // profile: aktuelles Profil-Objekt aus useAuth()
  // updateProfile: updateProfile-Funktion aus useAuth() (schreibt + setzt lokalen State)
  async function updateStreak(profile, updateProfile) {
    if (!profile) return
    const today = new Date().toISOString().split('T')[0]
    const last = profile.streak_last_date
    if (last === today) return // heute bereits gezählt

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const newCount = last === yesterday ? (profile.streak_count || 0) + 1 : 1

    logger.debug('Streak calculated', { currentStreak: newCount, lastActivity: last })

    try {
      await updateProfile({ streak_count: newCount, streak_last_date: today })
    } catch (error) {
      logger.error('Failed to update streak', error)
    }
  }

  return { updateStreak }
}
