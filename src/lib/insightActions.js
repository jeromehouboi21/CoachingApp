// src/lib/insightActions.js — Schreibaktionen an eigenen Erkenntnissen (U3)
// Gemeinsam für Heute (Nachklang, Wiederentdecken), Spiegel („Vorschlag – stimmt das?“) und Abschluss.
// Jede Aktion bestätigt den Write über .select('id') (RLS liefert sonst still 0 Zeilen) und gibt
// { ok } zurück. Das UI zeigt Erfolg erst danach (kein stilles Scheitern). Logs nur mit Fehlercode.

import { supabase } from './supabase'
import { createLogger } from './logger'

const logger = createLogger('insightActions')

async function updateOne(id, fields, code) {
  const { data, error } = await supabase.from('insights').update(fields).eq('id', id).select('id')
  if (error || !data?.length) {
    logger.error(code, { code: error?.code ?? 'no_rows' })
    return { ok: false }
  }
  return { ok: true }
}

/** „Ja, stimmt so“: aus dem Vorschlag wird die eigene Erkenntnis. */
export function confirmInsight(id) {
  return updateOne(id, { source: 'user', confirmed_at: new Date().toISOString() }, 'insight_confirm_failed')
}

/** „Anpassen“: eigener Wortlaut ersetzt den Vorschlag. */
export function adaptInsight(id, content) {
  const text = (content ?? '').trim()
  if (!text) return Promise.resolve({ ok: false })
  return updateOne(id, { content: text, source: 'user', confirmed_at: new Date().toISOString() }, 'insight_adapt_failed')
}

/** „Heute nicht“: Karte verschwindet von Heute, bleibt im Spiegel. */
export function dismissInsight(id) {
  return updateOne(id, { dismissed_at: new Date().toISOString() }, 'insight_dismiss_failed')
}

/** Auf Heute angezeigt (Nachklang oder Wiederentdecken). Scheitern blockiert nichts, wird aber geloggt. */
export function markSurfaced(id) {
  return updateOne(id, { surfaced_at: new Date().toISOString() }, 'insight_surface_failed')
}

/** „Deine Einschätzung“ (U5a): 'helpful' | 'unclear' | 'disagree' oder null (zurücknehmen). */
export function rateInsight(id, rating) {
  const value = ['helpful', 'unclear', 'disagree'].includes(rating) ? rating : null
  return updateOne(id, { user_rating: value, rated_at: value ? new Date().toISOString() : null }, 'insight_rate_failed')
}

/** „Entfernen“: Erkenntnis löschen. */
export async function removeInsight(id) {
  const { data, error } = await supabase.from('insights').delete().eq('id', id).select('id')
  if (error || !data?.length) {
    logger.error('insight_delete_failed', { code: error?.code ?? 'no_rows' })
    return { ok: false }
  }
  return { ok: true }
}

/** Neue, vom Nutzer bestätigte Erkenntnis (Abschluss-Modal, Vorhaben). */
export async function createConfirmedInsight({ userId, conversationId, content, category }) {
  const text = (content ?? '').trim()
  if (!userId || !text) return { ok: false }
  const { data, error } = await supabase.from('insights').insert({
    user_id: userId,
    conversation_id: conversationId ?? null,
    content: text,
    category,
    source: 'user',
    confirmed_at: new Date().toISOString(),
  }).select('id')
  if (error || !data?.length) {
    logger.error('insight_insert_failed', { code: error?.code ?? 'no_rows', category })
    return { ok: false }
  }
  return { ok: true, id: data[0].id }
}
