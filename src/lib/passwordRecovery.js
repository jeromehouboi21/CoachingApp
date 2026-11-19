// src/lib/passwordRecovery.js — Erkennung des Links „Neues Passwort“ (Paket K, W1)
//
// Der Supabase-Client läuft im impliziten Flow (src/lib/supabase.js ohne flowType): Der Link aus der
// Reset-Mail landet auf /passwort-neu mit Token im URL-Fragment, der Client liest es beim Start und
// meldet PASSWORD_RECOVERY. Dieses Ereignis kann feuern, bevor ein Screen montiert ist. Deshalb wird
// das Fragment hier beim Laden gelesen (vor der Verarbeitung durch den Client) und zusätzlich das
// Ereignis abonniert. Der Merker liegt in sessionStorage, damit ein Neuladen der Seite ihn nicht verliert.
import { supabase } from './supabase'

const KEY = 'fs_pw_recovery'

function readHash() {
  try {
    const h = new URLSearchParams((window.location.hash || '').replace(/^#/, ''))
    return { type: h.get('type'), errorCode: h.get('error_code') || h.get('error') }
  } catch {
    return { type: null, errorCode: null }
  }
}

const initial = readHash()
// Link abgelaufen oder schon benutzt (Supabase hängt dann error_code an, z. B. otp_expired)
export const recoveryLinkError = initial.errorCode ? String(initial.errorCode) : null

function setFlag(on) {
  try { on ? sessionStorage.setItem(KEY, '1') : sessionStorage.removeItem(KEY) } catch { /* ohne Speicher nur bis zum Neuladen */ }
}
let memoryFlag = initial.type === 'recovery'
if (memoryFlag) setFlag(true)

supabase.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') { memoryFlag = true; setFlag(true) }
  if (event === 'SIGNED_OUT') { memoryFlag = false; setFlag(false) }
})

export function isRecoverySession() {
  if (memoryFlag) return true
  try { return sessionStorage.getItem(KEY) === '1' } catch { return false }
}

export function clearRecovery() {
  memoryFlag = false
  setFlag(false)
}
