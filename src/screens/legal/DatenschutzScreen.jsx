import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { PreliminaryNotice } from '../../components/legal/PreliminaryNotice'
import { activeDataRecipients, BACKUP_DELETION } from '../../content/legalTexts'

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
        <p className="text-[12px] text-ink-3 mb-3">Version 2.0 · Stand: 20.11.2026</p>
        <PreliminaryNotice className="mb-8" />

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
              <li>· Was der Begleiter sich aus deinen Gesprächen merkt (Gedächtnis, Erkenntnisse, Muster)</li>
              <li>· Erkenntnisse und Reflexionen, die du selbst eingibst</li>
              <li>· Nutzungszähler (z. B. Anzahl der Gespräche, Reflexionstage)</li>
              <li>· Zeitpunkt und Version deiner Zustimmung zur Coaching-Vereinbarung und deiner Einwilligung (Nachweis nach Art. 7 Abs. 1 DSGVO)</li>
              <li>· Bei Hinweisen auf eine akute Krise: ein kurzer Ausschnitt deiner Nachricht (Einzelheiten in der Coaching-Vereinbarung)</li>
              <li>· Technische Protokolle ohne Gesprächsinhalte (z. B. Kennungen, Zeitpunkte, Fehlercodes)</li>
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
              <li>· Allgemeine Verbesserung des Begleiters aus allen Gesprächen, ohne Angaben zu einzelnen Personen (Teil deiner Einwilligung, Art. 9 Abs. 2 lit. a DSGVO; Einzelheiten in der Coaching-Vereinbarung)</li>
              <li>· Lernbasis: nur mit gesonderter, freiwilliger Einwilligung im Profil (Art. 9 Abs. 2 lit. a DSGVO)</li>
              <li>· Sicherstellung der technischen Funktionsfähigkeit und Sicherheit (Art. 6 Abs. 1 lit. f DSGVO)</li>
            </ul>
            <p>
              Deine Daten werden nicht für Werbezwecke genutzt und nicht an Dritte verkauft.
            </p>
          </Section>

          <Section title="5. Datenverarbeitung durch Dienstleister">
            <p>
              Folgende Dienstleister verarbeiten Daten in unserem Auftrag. Sie sind über Verträge zur
              Auftragsverarbeitung (Art. 28 DSGVO) an unsere Weisungen gebunden. Übermittlungen in Länder
              außerhalb der EU sind über die EU-Standardvertragsklauseln abgesichert. In diesen Ländern gilt
              dennoch ein anderes Datenschutzniveau, und Behörden können dort unter bestimmten Voraussetzungen
              auf Daten zugreifen.
            </p>
            {activeDataRecipients().map(r => (
              <div key={r.name} className="mt-2">
                <p className="text-ink font-medium">{r.name}</p>
                <p><span className="text-ink-3">Ort:</span> {r.location}</p>
                <p><span className="text-ink-3">Zweck:</span> {r.purpose}</p>
                <p><span className="text-ink-3">Daten:</span> {r.data}</p>
                <p><span className="text-ink-3">Absicherung:</span> {r.safeguard}</p>
              </div>
            ))}
            <p className="mt-2">
              Mit Supabase besteht ein Auftragsverarbeitungsvertrag (Referenz: YZIGG-Q82S3-WUMOL-FX5BT,
              unterzeichnet am 22.03.2026).
            </p>
          </Section>

          <Section title="6. Speicherdauer">
            <p>
              Deine Daten werden so lange gespeichert, wie dein Konto besteht. Löschst du dein Konto,
              werden deine Daten sofort aus der App entfernt und {BACKUP_DELETION} auch aus den
              Sicherungskopien gelöscht.
            </p>
            <p>
              Technische Protokolle ohne Gesprächsinhalte werden nach 30 Tagen gelöscht. Weitere Fristen,
              etwa für Krisen-Ausschnitte und für Notizen zur Verbesserung des Begleiters, stehen in der
              Coaching-Vereinbarung.
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
              <a href="/supabase-dpa.pdf" target="_blank" rel="noopener noreferrer" className="text-accent underline">
                Supabase DPA (PDF) →
              </a>
            </p>
          </div>

          {/* Paket K W2: nur ein Link, keine Textänderung */}
          <button onClick={() => navigate('/sicherheit')} className="text-[13px] text-accent hover:underline text-left">
            Wie wir deine Daten schützen ›
          </button>

        </div>
      </div>
    </div>
  )
}
