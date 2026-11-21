// Unit-Tests für den Einstiegs-Rundgang (Handoff 6.1). Läuft mit `npm test` (node --test, ohne Paket).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shouldShowTour, TOUR_MAX_CONVERSATIONS } from './tourState.js'

const base = {
  tourDismissedAt: null,
  conversationsHeld: 0,
  startedOnToday: true,
  shownThisSession: false,
  blockingGateOpen: false,
}

test('neu, 0 Gespräche, Start auf Heute, nicht gezeigt, kein Gate → zeigen', () => {
  assert.equal(shouldShowTour(base), true)
})

test('tourDismissedAt gesetzt → nicht zeigen', () => {
  assert.equal(shouldShowTour({ ...base, tourDismissedAt: '2026-11-21T10:00:00Z' }), false)
})

test('3 geführte Gespräche, kein Haken → nicht zeigen', () => {
  assert.equal(TOUR_MAX_CONVERSATIONS, 3)
  assert.equal(shouldShowTour({ ...base, conversationsHeld: 3 }), false)
  assert.equal(shouldShowTour({ ...base, conversationsHeld: 12 }), false)
})

test('2 geführte Gespräche → zeigen', () => {
  assert.equal(shouldShowTour({ ...base, conversationsHeld: 2 }), true)
})

test('Start nicht auf Heute (Deep Link /coach) → nicht zeigen', () => {
  assert.equal(shouldShowTour({ ...base, startedOnToday: false }), false)
})

test('in dieser Sitzung schon gezeigt → nicht zeigen', () => {
  assert.equal(shouldShowTour({ ...base, shownThisSession: true }), false)
})

test('Sperre über Heute offen (18+-Sheet) → nicht zeigen', () => {
  assert.equal(shouldShowTour({ ...base, blockingGateOpen: true }), false)
})

test('Gesprächszahl unbekannt (Ladefehler auf Heute) → nicht zeigen', () => {
  assert.equal(shouldShowTour({ ...base, conversationsHeld: null }), false)
  assert.equal(shouldShowTour({ ...base, conversationsHeld: undefined }), false)
})
