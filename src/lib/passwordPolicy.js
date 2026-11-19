// src/lib/passwordPolicy.js — Passwortregeln und Texte (Paket K, W1)
// Gilt für Passwort ändern, Passwort neu (Reset), Registrierung und Einladung (D-2).
// Die Mindestlänge ist zusätzlich im Supabase-Dashboard gesetzt; diese Prüfung ist nur die Bedienung.
// Log-Regel: nie Passwörter, nie E-Mail-Adressen loggen – nur Fehlercodes.

export const PASSWORD_MIN_LENGTH = 12

export function checkNewPassword(pw, repeat) {
  if (!pw || pw.length < PASSWORD_MIN_LENGTH) return 'too_short'
  if (repeat !== undefined && pw !== repeat) return 'mismatch'
  return null
}

// Fehlertexte nach Sprachprinzip
export const PASSWORD_MESSAGES = {
  too_short: `Das Passwort braucht mindestens ${PASSWORD_MIN_LENGTH} Zeichen.`,
  mismatch: 'Die beiden Passwörter stimmen nicht überein.',
  same_password: 'Das neue Passwort ist dasselbe wie das bisherige.',
  weak_password: 'Dieses Passwort ist zu leicht zu erraten. Ein Satz, den du dir merken kannst, funktioniert gut.',
  current_password_wrong: 'Das aktuelle Passwort stimmt nicht.',
  rate_limited: 'Das waren gerade viele Versuche. Probier es in ein paar Minuten noch einmal.',
  generic: 'Das hat gerade nicht geklappt. Versuch es bitte später noch einmal.',
}

export const PASSWORD_HINT = `Mindestens ${PASSWORD_MIN_LENGTH} Zeichen. Ein Satz, den du dir merken kannst, funktioniert gut.`

export function isRateLimit(error) {
  return error?.status === 429 || ['over_request_rate_limit', 'over_email_send_rate_limit'].includes(error?.code)
}

/** Supabase-Fehler → Schlüssel aus PASSWORD_MESSAGES. Unbekannte Codes → 'generic'. */
export function mapAuthError(error) {
  const code = error?.code ?? ''
  if (isRateLimit(error)) return 'rate_limited'
  if (code === 'same_password') return 'same_password'
  if (code === 'weak_password') return 'weak_password'
  // Falsches bzw. fehlendes aktuelles Passwort (genauer Code beim Test mit Testkonto A ermitteln)
  if (['invalid_credentials', 'reauthentication_needed', 'reauthentication_not_valid'].includes(code)
      || /current.?password/i.test(code)) return 'current_password_wrong'
  return 'generic'
}
