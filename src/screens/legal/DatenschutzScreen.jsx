import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-[16px] font-medium text-ink mb-2">{title}</h2>
      <div className="text-[14px] text-ink-2 leading-relaxed flex flex-col gap-2">
        {children}
      </div>
    </section>
  )
}

export function DatenschutzScreen() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-bg">
      <div className="px-5 pt-12 pb-24">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-ink-3 text-[13px] mb-6"
        >
          <ChevronLeft size={16} />
          Zurück
        </button>

        <h1 className="font-display text-[24px] text-ink mb-1">Datenschutzerklärung</h1>
        <p className="text-[12px] text-ink-3 mb-8">Version 1.0 · Stand: März 2026</p>

        <div className="flex flex-col gap-8 text-[14px] text-ink-2 leading-relaxed">

          <Section title="1. Verantwortlicher">
            <p>
              Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:
            </p>
            <p className="text-ink">
              Jerome Houboi<br />
              Damer Str. 41<br />
              41372 Niederkrüchten<br />
              E-Mail: jerome@houboi.de
            </p>
          </Section>

          <Section title="2. Art der verarbeiteten Daten">
            <p>
              Friedensstifter verarbeitet folgende personenbezogene Daten:
            </p>
            <ul className="flex flex-col gap-1 pl-3">
              <li>· E-Mail-Adresse (Registrierung und Authentifizierung)</li>
              <li>· Anzeigename (optional, selbst gewählt)</li>
              <li>· Gesprächsinhalte mit dem KI-Coach</li>
              <li>· Erkenntnisse und Reflexionen, die du selbst eingibst</li>
              <li>· Nutzungsstatistiken (Gesprächszähler, Streak)</li>
              <li>· IP-Adresse zum Zeitpunkt der Einwilligung (Nachweispflicht gem. Art. 7 DSGVO)</li>
            </ul>
          </Section>

          <Section title="3. Besondere Kategorien personenbezogener Daten (Art. 9 DSGVO)">
            <p>
              Gesprächsinhalte können Informationen zu deinem emotionalen Erleben, deiner psychischen
              Verfassung und persönlichen Lebensumständen enthalten. Diese Daten fallen unter die besonderen
              Kategorien gemäß Art. 9 DSGVO.
            </p>
            <p>
              Die Verarbeitung erfolgt ausschließlich auf Basis deiner ausdrücklichen Einwilligung
              (Art. 9 Abs. 2 lit. a DSGVO), die du bei der Registrierung erteilst. Du kannst diese
              Einwilligung jederzeit widerrufen (siehe Abschnitt 8).
            </p>
          </Section>

          <Section title="4. Zweck und Rechtsgrundlage der Verarbeitung">
            <p>
              Wir verarbeiten deine Daten ausschließlich für folgende Zwecke:
            </p>
            <ul className="flex flex-col gap-1 pl-3">
              <li>· Bereitstellung des KI-Coaching-Dienstes (Art. 6 Abs. 1 lit. b DSGVO)</li>
              <li>· Personalisierung des Coaching-Erlebnisses durch Coach-Gedächtnis (Einwilligung, Art. 6 Abs. 1 lit. a DSGVO)</li>
              <li>· Verarbeitung sensibler Gesprächsdaten (Art. 9 Abs. 2 lit. a DSGVO)</li>
              <li>· Sicherstellung der technischen Funktionsfähigkeit (Art. 6 Abs. 1 lit. f DSGVO)</li>
            </ul>
            <p>
              Deine Daten werden nicht für Werbezwecke genutzt und nicht an Dritte verkauft.
            </p>
          </Section>

          <Section title="5. Datenverarbeitung durch Dritte">
            <p className="text-ink font-medium">Supabase (Datenbankinfrastruktur)</p>
            <p>
              Wir nutzen Supabase als Datenbankinfrastruktur und Authentifizierungsdienst.
              Supabase-Server befinden sich in der EU (Frankfurt/Ireland). Mit Supabase wurde ein
              Auftragsverarbeitungsvertrag (AVV) gemäß Art. 28 DSGVO geschlossen
              (Referenz: YZIGG-Q82S3-WUMOL-FX5BT, unterzeichnet am 22.03.2026).
            </p>
            <p>
              Supabase-Datenschutzrichtlinie:{' '}
              <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-accent underline">
                supabase.com/privacy
              </a>
            </p>

            <p className="text-ink font-medium mt-3">Anthropic (KI-Verarbeitung)</p>
            <p>
              Gesprächsinhalte werden zur KI-Verarbeitung an Anthropic übermittelt (Claude API).
              Anthropic verarbeitet diese Daten nicht zum Training von KI-Modellen und speichert sie
              nicht dauerhaft. Es gilt die Zero Data Retention Policy von Anthropic.
            </p>
            <p>
              Anthropic-Datenschutzrichtlinie:{' '}
              <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="text-accent underline">
                anthropic.com/privacy
              </a>
            </p>

            <p className="text-ink font-medium mt-3">Vercel (Hosting)</p>
            <p>
              Die Web-App wird über Vercel gehostet. Vercel speichert keine Inhalte, sondern liefert
              nur den Anwendungscode aus.
            </p>
          </Section>

          <Section title="6. Speicherdauer">
            <p>
              Deine Daten werden so lange gespeichert, wie dein Konto besteht. Nach Kontolöschung
              werden alle personenbezogenen Daten innerhalb von 30 Tagen endgültig gelöscht.
            </p>
            <p>
              Logs und anonymisierte Nutzungsdaten (ohne Personenbezug) können für bis zu 90 Tage
              zur Fehlerbehebung gespeichert werden.
            </p>
          </Section>

          <Section title="7. Deine Rechte">
            <p>Du hast folgende Rechte gemäß DSGVO:</p>
            <ul className="flex flex-col gap-1 pl-3">
              <li>· <strong className="text-ink">Auskunft</strong> (Art. 15): Welche Daten wir über dich speichern</li>
              <li>· <strong className="text-ink">Berichtigung</strong> (Art. 16): Korrektur unrichtiger Daten</li>
              <li>· <strong className="text-ink">Löschung</strong> (Art. 17): Löschung aller deiner Daten</li>
              <li>· <strong className="text-ink">Einschränkung</strong> (Art. 18): Einschränkung der Verarbeitung</li>
              <li>· <strong className="text-ink">Datenübertragbarkeit</strong> (Art. 20): Export deiner Daten</li>
              <li>· <strong className="text-ink">Widerspruch</strong> (Art. 21): Widerspruch gegen Verarbeitung</li>
              <li>· <strong className="text-ink">Widerruf der Einwilligung</strong> (Art. 7 Abs. 3): Jederzeit möglich</li>
            </ul>
            <p>
              Zur Ausübung deiner Rechte wende dich an: jerome@houboi.de
            </p>
            <p>
              Du hast außerdem das Recht, bei der zuständigen Aufsichtsbehörde Beschwerde einzureichen:
              Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen,{' '}
              <a href="https://www.ldi.nrw.de" target="_blank" rel="noopener noreferrer" className="text-accent underline">
                ldi.nrw.de
              </a>
            </p>
          </Section>

          <Section title="8. Widerruf der Einwilligung">
            <p>
              Du kannst deine Einwilligung zur Verarbeitung deiner Daten jederzeit widerrufen,
              ohne dass die Rechtmäßigkeit der bis zum Widerruf erfolgten Verarbeitung berührt wird.
            </p>
            <p>
              Widerruf und Kontolöschung: Entweder direkt in der App (Profil → Konto löschen) oder
              per E-Mail an jerome@houboi.de.
            </p>
          </Section>

          <Section title="9. Datensicherheit">
            <p>
              Alle Datenübertragungen erfolgen verschlüsselt (TLS/HTTPS). Der Zugriff auf deine Daten
              ist durch Row Level Security (RLS) in der Datenbank geschützt — kein anderer Nutzer kann
              deine Daten einsehen.
            </p>
          </Section>

          <Section title="10. Änderungen dieser Datenschutzerklärung">
            <p>
              Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf anzupassen. Bei wesentlichen
              Änderungen wirst du innerhalb der App informiert und gebeten, der aktualisierten Version
              erneut zuzustimmen.
            </p>
          </Section>

          <div className="bg-surface border border-[var(--color-border)] rounded-xl p-4 mt-2">
            <p className="text-[12px] text-ink-3">
              Auftragsverarbeitungsvertrag mit Supabase:{' '}
              <a href="/public/supabase-dpa.pdf" target="_blank" rel="noopener noreferrer" className="text-accent underline">
                Supabase DPA (PDF) →
              </a>
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
