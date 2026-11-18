// Rate-Limit-Antworten der Edge Functions (HTTP 429 mit { error: 'rate_limited', retryAfter }).
// Abzugrenzen vom Monatslimit der Gespräche (429 mit 'Session limit reached').

const CRISIS_HINT =
  'Wenn es dir gerade sehr schlecht geht: Die Telefonseelsorge ist rund um die Uhr kostenlos erreichbar — 0800 111 0 111 oder 0800 111 0 222.'

/** Liefert { retryAfter } bei einem Rate-Limit, sonst null (z. B. Monatslimit). */
export async function readRateLimit(response) {
  if (response.status !== 429) return null
  try {
    const body = await response.clone().json()
    if (body?.error !== 'rate_limited') return null
    const retryAfter = Number(body.retryAfter) || Number(response.headers.get('Retry-After')) || 60
    return { retryAfter }
  } catch {
    return null
  }
}

export function rateLimitMessage(retryAfter) {
  const text = retryAfter > 300
    ? 'Für heute sind sehr viele Nachrichten zusammengekommen — das Tageskontingent ist erreicht. Morgen kannst du hier weiterschreiben.'
    : 'Kurze Pause: Gerade kamen sehr viele Nachrichten in kurzer Zeit. In etwa einer Minute kannst du weiterschreiben.'
  // ChatBubble rendert keine Zeilenumbrüche → ein Absatz
  return `${text} ${CRISIS_HINT}`
}
