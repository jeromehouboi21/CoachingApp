// Angemeldet, aber das Profil fehlt oder lässt sich nicht laden (W4-Befund 20.11.2026).
// Zeigt keinen Weg an, der hier scheitern würde (Zustimmung, Gespräch), sondern Neu laden, Abmelden
// und eine Kontaktmöglichkeit. Keine Daten, keine Datenbankaufrufe.
import { useNavigate } from 'react-router-dom'
import { OPERATOR } from '../../content/legalTexts'

export function ProfileMissingScreen({ onSignOut }) {
  const navigate = useNavigate()
  const signOut = async () => {
    try { await onSignOut() } catch { /* Sitzung ist ggf. schon ungültig */ }
    navigate('/landing', { replace: true })
  }
  return (
    <div className="min-h-screen bg-bg max-w-lg mx-auto flex flex-col justify-center px-6 py-10">
      <h1 className="font-display text-[26px] text-ink leading-[1.25] mb-3">Dein Konto lässt sich gerade nicht laden</h1>
      <p className="text-[15px] text-ink-2 leading-relaxed mb-3">
        Versuch es bitte noch einmal. Wenn das nicht hilft, melde dich ab und wieder an.
      </p>
      <p className="text-[14px] text-ink-2 leading-relaxed mb-8">
        Bleibt es dabei, schreib mir an {OPERATOR.email}. Ich sehe mir das an.
      </p>
      <div className="flex flex-col gap-3">
        <button onClick={() => window.location.reload()} className="w-full bg-accent text-white py-3 rounded-full font-medium hover:bg-accent-2 transition-colors">
          Neu laden
        </button>
        <button onClick={signOut} className="w-full border border-[var(--color-border)] text-ink py-3 rounded-full font-medium">
          Abmelden
        </button>
      </div>
    </div>
  )
}
