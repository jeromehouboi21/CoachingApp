import { Avatar } from '../ui/Avatar'
import { getAgreementSections, AGREEMENT_SIGNATURE } from '../../content/legalTexts'
import { PreliminaryNotice } from './PreliminaryNotice'

/**
 * Der volle Text der Coaching-Vereinbarung (seit Paket K W3 aus src/content/legalTexts.js, v2.0).
 * Wird im Einstieg („Ganze Vereinbarung lesen ›“), bei der erneuten Zustimmung und im
 * Rückblick (/vereinbarung) gerendert – eine Quelle, damit die Stellen nicht auseinanderlaufen.
 * Abo-Abschnitte erscheinen erst mit PAYMENTS_ENABLED (CODE-5).
 */
export function CoachingAgreementContent() {
  return (
    <div className="flex flex-col gap-6 text-[14px] text-ink-2 leading-[1.7]">
      <PreliminaryNotice />
      {getAgreementSections().map(section => (
        <section key={section.heading}>
          <p className="text-[13px] text-ink-3 uppercase tracking-[0.05em] font-medium mb-2">{section.heading}</p>
          {(section.paragraphs ?? []).map(p => <p key={p} className="mb-3 last:mb-0">{p}</p>)}
          {section.points?.length > 0 && (
            <ul className="flex flex-col gap-1.5 pl-1">
              {section.points.map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-accent mt-0.5 flex-shrink-0">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
          {(section.closing ?? []).map(p => <p key={p} className="mt-3">{p}</p>)}
        </section>
      ))}

      <div className="flex items-center gap-3 pt-6 border-t border-[var(--color-border)]">
        <Avatar name={AGREEMENT_SIGNATURE.name} size="md" />
        <div>
          <p className="text-[14px] font-medium text-ink">{AGREEMENT_SIGNATURE.name}</p>
          <p className="text-[12px] text-ink-3">{AGREEMENT_SIGNATURE.role}</p>
        </div>
      </div>
    </div>
  )
}
