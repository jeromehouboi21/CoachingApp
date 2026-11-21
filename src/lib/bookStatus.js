// T1 Buch-Seite: reine Funktionen zum Buch-Status (Test: bookStatus.test.js, `npm test`).
// Spiegelt die Regeln der RPC set_book_status (Migration 044).

export const BOOK_STATUSES = ['read', 'reading', 'not_yet']
export const BOOK_PROGRESS_MAX = 7

// Prüft eine Eingabe, bevor die RPC aufgerufen wird.
export function isValidBookStatus(status, progress) {
  if (!BOOK_STATUSES.includes(status)) return false
  if (status === 'reading') {
    return Number.isInteger(progress) && progress >= 1 && progress <= BOOK_PROGRESS_MAX
  }
  return progress == null
}

// Status-Zeile für die Profil-Karte (Texte aus BOOK_UI_TEXT). null, wenn nichts angegeben.
export function bookStatusLine(status, progress, text) {
  if (status === 'read') return text.statusRead
  if (status === 'reading' && progress) return text.statusReading.replace('{n}', String(progress))
  if (status === 'not_yet') return text.statusNotYet
  return null
}
