import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useMemory(userId) {
  const [memory, setMemory] = useState(null)

  useEffect(() => {
    if (!userId) return
    supabase
      .from('user_memory')
      .select('*')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => { if (data) setMemory(data) })
  }, [userId])

  const updateMemory = useCallback(async (updates) => {
    if (!userId) return
    const { data } = await supabase
      .from('user_memory')
      .upsert({ user_id: userId, ...updates, last_updated: new Date().toISOString() }, { onConflict: 'user_id' })
      .select()
      .single()
    if (data) setMemory(data)
  }, [userId])

  return { memory, updateMemory }
}
