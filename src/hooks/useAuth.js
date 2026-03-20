import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { createLogger, setLoggerUserId } from '../lib/logger'

const logger = createLogger('useAuth')

export function useAuth() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        setLoggerUserId(session.user.id)
        logger.info('Session restored', { userId: session.user.id })
        loadProfile(session.user.id)
      } else {
        logger.debug('No session found')
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else {
        setProfile(null)
        setLoggerUserId(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) {
      logger.error('Failed to load profile', error)
    }
    setProfile(data)
    setLoading(false)
  }

  async function signUp(email, password, displayName) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      logger.error('Sign in failed', error)
      throw error
    }
    if (data.user) {
      setLoggerUserId(data.user.id)
      logger.info('User signed in', { method: 'password' })
      await supabase.from('profiles').insert({
        id: data.user.id,
        display_name: displayName || email.split('@')[0],
      })
    }
    return data
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      logger.error('Sign in failed', error)
      throw error
    }
    setLoggerUserId(data.user.id)
    logger.info('User signed in', { method: 'password' })
    return data
  }

  async function sendMagicLink(email) {
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) {
      logger.error('Sign in failed', error)
      throw error
    }
    logger.info('User signed in', { method: 'magic_link' })
  }

  async function signOut() {
    await supabase.auth.signOut()
    setLoggerUserId(null)
    logger.info('User signed out')
  }

  async function updateProfile(updates) {
    if (!user) return
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()
    if (error) throw error
    setProfile(data)
    return data
  }

  return { user, profile, loading, signUp, signIn, sendMagicLink, signOut, updateProfile }
}
