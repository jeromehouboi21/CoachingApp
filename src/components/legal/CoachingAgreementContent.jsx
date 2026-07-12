import { Avatar } from '../ui/Avatar'

/**
 * Der eigentliche Vertragstext der Coaching-Vereinbarung.
 * Wird sowohl im Onboarding (Step3bAgreement) als auch im nachträglichen
 * Rückblick (CoachingAgreementScreen unter /vereinbarung) gerendert —
 * eine einzige Quelle, damit beide Stellen nie auseinanderlaufen.
 */
export function CoachingAgreementContent() {
  return (
    <div className="flex flex-col gap-6 text-[14px] text-ink-2 leading-[1.7]">

      <section>
        <p className="text-[13px] text-ink-3 uppercase tracking-[0.05em] font-medium mb-2">Was du hier nutzt</p>
        <p>
          Der Coaching-Begleiter dieser App wurde von mir — Jerome Houboi,
          zertifizierter systemischer Coach — entwickelt und wird von mir
          verantwortet. Die Antworten generiert eine KI auf Basis der
          Prinzipien systemischen Coachings. Ich bin der Mensch hinter
          diesem Angebot.
        </p>
      </section>

      <section>
        <p className="text-[13px] text-ink-3 uppercase tracking-[0.05em] font-medium mb-2">Was das bedeutet für deine Daten</p>
        <p className="mb-3">
          Als Betreiber dieser App habe ich technischen Zugang zu den
          Inhalten deiner Gespräche — so wie ein Coach, der dein Gespräch
          führt, deine Themen kennt. Ich verpflichte mich, diese Inhalte
          vertraulich zu behandeln. Das bedeutet konkret:
        </p>
        <ul className="flex flex-col gap-1.5 pl-1">
          {[
            'Ich lese deine Gespräche nicht — außer bei einem technischen Problem, das meine direkte Intervention erfordert.',
            'Ich gebe deine Inhalte niemals an Dritte weiter.',
            'Ich nutze deine Inhalte nicht für Werbung, Analyse oder andere Zwecke.',
            'Diese Vertraulichkeit gilt auch nach Beendigung der Nutzung.',
          ].map(item => (
            <li key={item} className="flex items-start gap-2">
              <span className="text-accent mt-0.5 flex-shrink-0">·</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <p className="text-[13px] text-ink-3 uppercase tracking-[0.05em] font-medium mb-2">Was dieser Begleiter nicht ist</p>
        <p>
          Dieser Coaching-Begleiter ersetzt keine Psychotherapie, keine
          psychiatrische Behandlung und keine medizinische Beratung.
          Bei ernsthaften psychischen Beschwerden wende dich bitte
          an eine Fachkraft.
        </p>
      </section>

      <section>
        <p className="text-[13px] text-ink-3 uppercase tracking-[0.05em] font-medium mb-2">Deine Rechte</p>
        <p>
          Du kannst dein Konto und alle deine Daten jederzeit löschen.
          Diese Vereinbarung kann von dir jederzeit durch Löschung
          des Kontos beendet werden.
        </p>
      </section>

      {/* Jerome-Signatur */}
      <div className="flex items-center gap-3 pt-6 border-t border-[var(--color-border)]">
        <Avatar name="Jerome Houboi" size="md" />
        <div>
          <p className="text-[14px] font-medium text-ink">Jerome Houboi</p>
          <p className="text-[12px] text-ink-3">Zertifizierter systemischer Coach</p>
        </div>
      </div>
    </div>
  )
}
