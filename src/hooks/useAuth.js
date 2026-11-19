import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { createLogger, setLoggerUserId } from '../lib/logger'
import { functionHeaders, functionUrl } from '../lib/functions'
import { requestMfaCheck } from '../lib/mfa'

const logger = createLogger('useAuth')
const CURRENT_CONSENT_VERSION = '1.0'
const CURRENT_COACHING_AGREEMENT_VERSION = '1.0'

// S-06b: aal1 + verifizierter Faktor → Code-Abfrage, BEVOR das Profil geladen wird.
// (Die RLS-Policy mfa_required liefert sonst 0 Zeilen, und ein leeres Profil sähe aus wie
// „neuer Nutzer → Onboarding“.) Die Prüfung ist lokal (Sitzung + Faktorliste der Sitzung).
async function evaluateMfaGate() {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (error) {
    logger.warn('mfa_level_failed', { code: error.code ?? 'unknown' })
    return 'ok'
  }
  return data?.currentLevel === 'aal1' && data?.nextLevel === 'aal2' ? 'required' : 'ok'
}

export function useAuth() {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mfaGate, setMfaGate] = useState('ok')   // 'ok' | 'required'
  const seqRef = useRef(0)                        // nur das jüngste Auth-Ereignis zählt

  useEffect(() => {
    // Sitzung übernehmen: erst Sicherheitsstufe, dann (falls frei) Profil.
    async function applySession(session) {
      const seq = ++seqRef.current
      setUser(session?.user ?? null)
      setSession(session ?? null)
      if (!session?.user) {
        setProfile(null)
        setMfaGate('ok')
        setLoggerUserId(null)
        setLoading(false)
        return 'none'
      }
      setLoggerUserId(session.user.id)
      const gate = await evaluateMfaGate()
      if (seq !== seqRef.current) return 'stale'
      if (gate === 'required') {
        setMfaGate('required')
        setProfile(null)
        setLoading(false)
        return 'required'
      }
      // Erst Profil, dann Freigabe – sonst sähe App kurz ein leeres Profil
      await loadProfile(session.user.id)
      if (seq === seqRef.current) setMfaGate('ok')
      return 'ok'
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) logger.info('Session restored', { userId: session.user.id })
      else logger.debug('No session found')
      applySession(session)
    })

    // Kein await von supabase.auth-Aufrufen direkt im Callback (Auth-Sperre) → setTimeout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(async () => {
        const result = await applySession(session)
        if (result !== 'ok' || !session?.access_token) return

        // Pending Invite Code einlösen (nach E-Mail-Bestätigung)
        const pendingCode = localStorage.getItem('pendingInviteCode')
        if (pendingCode && session.access_token) {
          localStorage.removeItem('pendingInviteCode')
          try {
            const res = await fetch(
              functionUrl('validate-invite-code'),
              {
                method: 'POST',
                headers: functionHeaders(session.access_token),
                body: JSON.stringify({ code: pendingCode }),
              }
            )
            const result = await res.json()
            if (result.ok) {
              logger.info('Pending invite code redeemed')
              loadProfile(session.user.id) // Tester-Status sofort sichtbar
            } else {
              logger.warn('Pending invite code invalid', { status: res.status, reason: result.error ?? null })
            }
          } catch (err) {
            logger.warn('Failed to redeem pending invite code', { errorType: err?.name ?? 'Error' })
          }
        }
      }, 0)
    })

    // Zurück in die App (anderer Tab, Gerät entsperrt): Sicherheitsstufe erneut prüfen
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.user) return
        evaluateMfaGate().then((gate) => {
          if (gate === 'required') { setMfaGate('required'); setProfile(null) }
        })
      })
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', onVisible)
    }
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

  // meta: zusätzliche Registrierungsangaben (Onboarding, Einwilligung, Vereinbarung).
  // Name und meta gehen als Metadaten an Supabase Auth; der DB-Trigger handle_new_user
  // legt damit die profiles-Zeile an (Migration 027). Kein Client-Insert/Upsert in
  // profiles — das funktioniert auch bei aktiver E-Mail-Bestätigung, wenn nach signUp()
  // noch keine Session besteht.
  async function signUp(email, password, displayName, meta = {}) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { ...meta, display_name: displayName || email.split('@')[0] } },
    })
    if (error) {
      logger.error('Sign up failed', error)
      throw error
    }
    if (data.user) {
      setLoggerUserId(data.user.id)
      logger.info('User signed up', { method: 'password' })
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
    // Nur für bestehende Konten: Neue Konten entstehen ausschließlich über das
    // Onboarding (mit Datenschutz-Einwilligung und Coaching-Vereinbarung).
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
    if (error && (error.code === 'otp_disabled' || /signups not allowed/i.test(error.message || ''))) {
      logger.info('Magic link for unknown account', { method: 'magic_link' })
      throw new Error('Zu dieser E-Mail gibt es noch kein Konto. Registriere dich zuerst mit E-Mail und Passwort.')
    }
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

  // Profil neu laden (z. B. nach einem neuen Gespräch oder einem 429 vom Server),
  // damit Zähler und Limit-Modal den serverseitigen Stand zeigen.
  async function refreshProfile() {
    if (!user || mfaGate === 'required') return
    await loadProfile(user.id)
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

  return { user, session, profile, loading, mfaGate, refreshMfa: requestMfaCheck, signUp, signIn, sendMagicLink, signOut, updateProfile, refreshProfile, checkConsent, checkCoachingAgreement }
}
