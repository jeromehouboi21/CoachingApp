// src/lib/chatActivity.js – „Coach-Antwort läuft gerade“ als kleiner globaler Zustand (Paket P).
// useChat meldet isLoading; UpdateBanner sperrt währenddessen „Jetzt aktualisieren“, InstallCard bleibt weg.
let busy = false
const listeners = new Set()
export function setChatBusy(value) {
  if (busy === !!value) return
  busy = !!value
  listeners.forEach((fn) => fn(busy))
}
export function isChatBusy() { return busy }
export function subscribeChatBusy(fn) { listeners.add(fn); return () => listeners.delete(fn) }
