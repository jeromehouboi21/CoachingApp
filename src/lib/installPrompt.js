// src/lib/installPrompt.js – fängt das Installations-Angebot des Browsers ab, bevor React rendert (Paket P).
// beforeinstallprompt feuert früh; ein Hook auf einem späteren Screen käme zu spät. Import in main.jsx.
let deferred = null
const listeners = new Set()
const notify = () => listeners.forEach((fn) => fn())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; notify() })
  window.addEventListener('appinstalled', () => { deferred = null; notify() })
}

export function subscribeInstall(fn) { listeners.add(fn); return () => listeners.delete(fn) }
export function getDeferredPrompt() { return deferred }
export function clearDeferredPrompt() { deferred = null; notify() }
