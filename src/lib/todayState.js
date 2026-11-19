// src/lib/todayState.js — welcher Zustand von Heute gerade dran ist (UX-Konzept 4.1, U3).
// Reine Funktion ohne Datenbankzugriff, damit sie sich testen lässt.

const DAY = 86400000

function isToday(iso) {
  const d = new Date(iso)
  const n = new Date()
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
}

function weekStart(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))   // Montag
  return d
}

// Zustand von Heute aus vorhandenen Daten (UX-Konzept 4.1, U3, E-U3-5). Reihenfolge A → D → B → C2 → C.
export function chooseTodayState(conversations, insights, now = Date.now()) {
  if (!conversations.some(c => Number(c.message_count) >= 3)) return { state: 'A' }
  if (conversations.some(c => Number(c.message_count) >= 3 && isToday(c.updated_at))) return { state: 'D' }

  // B – Nachklang: letzte 7 Tage, nicht weggeschoben; noch nicht bestätigte Vorschläge oder Vorhaben.
  // U5a: „Teile ich nicht“ erscheint nie auf Heute (UX 8.1)
  const visible = insights.filter(i => i.user_rating !== 'disagree')

  const recent = visible
    .filter(i => now - new Date(i.created_at).getTime() <= 7 * DAY && !i.dismissed_at)
    .filter(i => i.category === 'ziel' || (i.source === 'auto' && !i.confirmed_at))
    .sort((a, b) => (a.category === 'ziel') === (b.category === 'ziel')
      ? new Date(b.created_at) - new Date(a.created_at)
      : a.category === 'ziel' ? -1 : 1)
  if (recent.length) return { state: 'B', insight: recent[0] }

  // C2 – Wiederentdecken: älter als 14 Tage, nie auf Heute gezeigt, höchstens einmal pro Kalenderwoche.
  // Eine frühere Wiederentdeckung erkennt man daran, dass surfaced_at > 14 Tage nach created_at liegt.
  const ws = weekStart(new Date(now)).getTime()
  const rediscoveredThisWeek = insights.some(i => i.surfaced_at
    && new Date(i.surfaced_at).getTime() >= ws
    && new Date(i.surfaced_at) - new Date(i.created_at) > 14 * DAY)
  if (!rediscoveredThisWeek) {
    // Vorrang für ✦ (Hat mich weitergebracht), sonst die neueste (U5a, UX 8.1)
    const candidates = visible
      .filter(i => !i.surfaced_at && !i.dismissed_at && now - new Date(i.created_at).getTime() > 14 * DAY)
      .sort((a, b) => ((b.user_rating === 'helpful') - (a.user_rating === 'helpful'))
        || (new Date(b.created_at) - new Date(a.created_at)))
    if (candidates.length) return { state: 'C2', insight: candidates[0] }
  }
  return { state: 'C' }
}
