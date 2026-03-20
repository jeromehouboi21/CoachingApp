import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { createLogger } from '../lib/logger'

const logger = createLogger('useMemory')

export function useMemory(userId) {
  const [memory, setMemory] = useState(null)

  useEffect(() => {
    if (!userId) return
    supabase
      .from('user_memory')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          logger.error('Failed to load user memory', error)
          return
        }
        if (data) {
          setMemory(data)
          logger.info('User memory loaded', {
            hasThemes:   !!(data.themes?.length),
            hasPatterns: !!(data.patterns?.length),
            hasStrengths: !!(data.strengths?.length),
          })
        }
      })
  }, [userId])

  const updateMemory = useCallback(async (updates) => {
    if (!userId) return
    const { data, error } = await supabase
      .from('user_memory')
      .upsert({ user_id: userId, ...updates, last_updated: new Date().toISOString() }, { onConflict: 'user_id' })
      .select()
      .single()
    if (error) {
      logger.error('Failed to update user memory', error)
      return
    }
    if (data) {
      setMemory(data)
      logger.info('User memory updated', { updatedFields: Object.keys(updates) })
    }
  }, [userId])

  return { memory, updateMemory }
}
