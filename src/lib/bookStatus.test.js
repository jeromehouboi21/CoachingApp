// Unit-Tests für den Buch-Status (Handoff T1 6.1). Läuft mit `npm test`.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isValidBookStatus, bookStatusLine, BOOK_PROGRESS_MAX } from './bookStatus.js'

const text = {
  statusRead: 'Du hast das Buch gelesen',
  statusReading: 'Du liest gerade Teil {n}',
  statusNotYet: 'Noch nicht gelesen',
}

test('read und not_yet ohne Lesestand sind gültig', () => {
  assert.equal(isValidBookStatus('read', null), true)
  assert.equal(isValidBookStatus('not_yet', null), true)
  assert.equal(isValidBookStatus('read', undefined), true)
})

test('reading mit Teil 1–7 ist gültig', () => {
  assert.equal(BOOK_PROGRESS_MAX, 7)
  assert.equal(isValidBookStatus('reading', 1), true)
  assert.equal(isValidBookStatus('reading', 3), true)
  assert.equal(isValidBookStatus('reading', 7), true)
})

test('reading ohne Teil ist ungültig (wird nicht gespeichert)', () => {
  assert.equal(isValidBookStatus('reading', null), false)
})

test('reading mit 0, 8 oder 2.5 ist ungültig', () => {
  assert.equal(isValidBookStatus('reading', 0), false)
  assert.equal(isValidBookStatus('reading', 8), false)
  assert.equal(isValidBookStatus('reading', 2.5), false)
})

test('read mit Lesestand ist ungültig', () => {
  assert.equal(isValidBookStatus('read', 3), false)
})

test('unbekannter Status ist ungültig', () => {
  assert.equal(isValidBookStatus('gelesen', null), false)
  assert.equal(isValidBookStatus(null, null), false)
})

test('Status-Zeile', () => {
  assert.equal(bookStatusLine('reading', 3, text), 'Du liest gerade Teil 3')
  assert.equal(bookStatusLine('read', null, text), 'Du hast das Buch gelesen')
  assert.equal(bookStatusLine('not_yet', null, text), 'Noch nicht gelesen')
  assert.equal(bookStatusLine(null, null, text), null)
})
