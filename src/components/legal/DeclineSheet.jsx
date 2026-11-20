// „Lieber nicht“ für neue Nutzer (Paket K W3, Konzept 2.4): kein Konto, nichts gespeichert,
// kein Druck, keine zweite Nachfrage. Externe Links ohne Referrer.
import { DECLINE_NEW } from '../../content/legalTexts'
import { LegalSheet } from './LegalSheet'

export function DeclineSheet({ onClose }) {
  return (
    <LegalSheet title={DECLINE_NEW.title} onClose={onClose}>
      <p className="text-[14px] text-ink-2 leading-[1.7] mb-4">{DECLINE_NEW.text}</p>
      <p className="text-[14px] text-ink-2 leading-[1.7] mb-2">{DECLINE_NEW.alternativesIntro}</p>
      <ul className="flex flex-col gap-2 mb-6">
        {DECLINE_NEW.alternatives.map(a => (
          <li key={a.label}>
            <a href={a.href} target="_blank" rel="noopener noreferrer" className="text-[14px] text-accent hover:underline">
              {a.label} ›
            </a>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onClose} className="w-full text-[14px] text-ink-3 hover:text-ink-2 py-2">
        Zurück
      </button>
    </LegalSheet>
  )
}
