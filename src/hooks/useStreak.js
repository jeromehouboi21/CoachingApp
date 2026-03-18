import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useStreak(userId) {
  async function updateStreak() {
    if (!userId) return
    const today = new Date().toISOString().split('T')[0]
    const { data: profile } = await supabase
      .from('profiles')
      .select('streak_count, streak_last_date')
      .eq('id', userId)
      .single()

    if (!profile) return
    const last = profile.streak_last_date
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    let newCount = 1
    if (last === today) return // already updated today
    if (last === yesterday) newCount = (profile.streak_count || 0) + 1

    await supabase.from('profiles').update({
      streak_count: newCount,
      streak_last_date: today,
    }).eq('id', userId)
  }

  return { updateStreak }
}
