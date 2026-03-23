import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { createLogger, setLoggerUserId } from '../lib/logger'

const logger = createLogger('useAuth')
const CURRENT_CONSENT_VERSION = '1.0'
const CURRENT_COACHING_AGREEMENT_VERSION = '1.0'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        setSession(session)
        setLoggerUserId(session.user.id)
        logger.info('Session restored', { userId: session.user.id })
        loadProfile(session.user.id)
      } else {
        logger.debug('No session found')
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      setSession(session ?? null)

      if (session?.user) {
        loadProfile(session.user.id)

        // Pending Invite Code einlösen (nach E-Mail-Bestätigung)
        const pendingCode = localStorage.getItem('pendingInviteCode')
        if (pendingCode && session.access_token) {
          localStorage.removeItem('pendingInviteCode')
          try {
            const res = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-invite-code`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                  'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ code: pendingCode }),
              }
            )
            const result = await res.json()
            if (result.ok) {
              logger.info('Pending invite code redeemed', { code: pendingCode })
            } else {
              logger.warn('Pending invite code invalid', { code: pendingCode, error: result.error })
            }
          } catch (err) {
            logger.warn('Failed to redeem pending invite code', err)
          }
        }
      } else {
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

  function checkConsent(profileData) {
    const p = profileData ?? profile
    if (!p?.consent_given_at || !p?.consent_version) return 'missing'
    if (p.consent_version !== CURRENT_CONSENT_VERSION) return 'outdated'
    return 'valid'
  }

  function checkCoachingAgreement(profileData) {
    const p = profileData ?? profile
    if (!p?.coaching_agreement_accepted_at || !p?.coaching_agreement_version) return 'missing'
    if (p.coaching_agreement_version !== CURRENT_COACHING_AGREEMENT_VERSION) return 'outdated'
    return 'valid'
  }

  return { user, session, profile, loading, signUp, signIn, sendMagicLink, signOut, updateProfile, checkConsent, checkCoachingAgreement }
}
