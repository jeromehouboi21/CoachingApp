// src/content/legalTexts.js — Rechtstexte des neuen Einstiegs (Paket K, W3 = R-1)
//
// ENTWURF v3 (20.11.2026), nach dem Abgleich mit dem Code (legaltexte-abgleich.md).
// NICHT anwaltlich geprüft. Jerome ersetzt bzw. bestätigt die Texte nach dem Anwaltstermin.
//
// Stellen in [eckigen Klammern] sind offen:
//   [Offen: …]  Angabe oder Entscheidung von Jerome fehlt
//   [Prüfen: …] Aussage muss gegen Code, Anbieter-DPA oder mit dem Anwalt geprüft werden
// Laufzeitwerte, die die App einsetzt, stehen in {geschweiften Klammern}.
//
// Diese Texte setzen folgende Code-Änderungen voraus (sonst stimmen sie nicht):
//   CODE-1  Spracheingabe über den Browser ausschalten, bis sie über Mistral (EU) läuft (A2)
//   CODE-2  OpenAI nur aufrufen, wenn die Lernbasis eingeschaltet ist und freigegebene Einträge hat (A4)
//   CODE-3  Reflexions-Prompt (post-conversation → coach_reflections): keine Namen, Orte,
//           Zitate oder sonstigen erkennbaren Details (A3)
//   CODE-4  chat prüft die Zustimmung (Version 2.0) serverseitig (B11)
//   CODE-5  Abschnitte mit paymentOnly erst anzeigen, wenn die Zahlung live ist (B7)
//
// Freigabe in drei Stufen (LEGAL_TEXTS_STATUS), geprüft von scripts/security/check-content.mjs:
//   'entwurf'      – Produktion gesperrt, Klammern erlaubt (nur Vorschau-Builds)
//   'vorlaeufig'   – Produktion erlaubt; angezeigte Texte ohne [Klammern], PRELIMINARY_NOTICE sichtbar;
//                    offene Fragen an den Anwalt stehen in LEGAL_REVIEW_OPEN (nicht im Text)
//   'freigegeben'  – zusätzlich LEGAL_REVIEW_OPEN leer, Kennzeichnung verschwindet
// allLegalStrings() sammelt alle Texte dieser Datei automatisch ein.
// LEGAL_TEXTS_STATUS setzt nur Jerome. Claude Code ändert diesen Wert nie.

export const LEGAL_TEXTS_STATUS = 'vorlaeufig'   // 'entwurf' | 'vorlaeufig' | 'freigegeben'

// Sichtbare Kennzeichnung, solange die Texte nicht 'freigegeben' sind (Screen 3, Vereinbarung,
// Datenschutzerklärung). Text von Jerome freigegeben am 20.11.2026.
export const PRELIMINARY_NOTICE = 'Vorläufige Fassung vom 20.11.2026. Die anwaltliche Prüfung steht noch aus. Ändert sich danach etwas, zeige ich dir die neue Fassung und du entscheidest erneut.'
export const SHOW_PRELIMINARY_NOTICE = LEGAL_TEXTS_STATUS !== 'freigegeben'

// Offene Fragen an den Anwalt (docs/konto/anwaltstermin-fragen.md). Stehen bewusst NICHT im
// angezeigten Text. Erst wenn diese Liste leer ist, darf der Status 'freigegeben' werden.
export const LEGAL_REVIEW_OPEN = [
  { id: 'R1', where: 'DATA_RECIPIENTS Anthropic', question: 'Anthropic DPA, Schedule 1 B.3 „Special categories: None“ – trägt der Vertrag die Übermittlung von Gesundheits- und Gefühlsdaten?', ref: 'Fragenliste Nr. 1' },
  { id: 'R2', where: 'DATA_RECIPIENTS OpenAI', question: 'OpenAI DPA, Schedule 1 Nr. 5 „No sensitive data is intended“ – darf die erste Nachricht an OpenAI gehen (nur mit Lernbasis)?', ref: 'Fragenliste Nr. 2' },
  { id: 'R3', where: 'CONSENT_ART9_CHECKBOX', question: 'Darf das allgemeine Lernen (Supervision) Teil der Pflicht-Einwilligung sein? Art. 7 Abs. 4 DSGVO', ref: 'Fragenliste Nr. 3' },
  { id: 'R4', where: 'Vereinbarung, Krisen-Eintrag', question: 'Rechtsgrundlage (Art. 9 Abs. 2 lit. f) und Dauer (drei Jahre) des Krisen-Eintrags; Löschung mit dem Konto', ref: 'Fragenliste Nr. 4' },
  { id: 'R5', where: 'Vereinbarung, Haftung', question: 'Haftungsbeschränkung beim kostenlosen Kennenlernen zulässig?', ref: 'Fragenliste Nr. 5' },
  { id: 'R6', where: 'gesamte Fassung', question: 'Weitere Punkte zur Bestätigung (Pflicht-Einwilligung, Betreiberzugang, neue Fassung, Bestandsnutzer, Vercel, one.com, KI-Hinweis, 18+, Schweigepflicht)', ref: 'Fragenliste Nr. 6–14' },
]

export const CONSENT_VERSION = '2.0'
export const AGREEMENT_VERSION = '2.0'

// Schalter (keine Texte, CODE-6): Was dahinter steht, wird erst angezeigt und von der
// Build-Prüfung erst geprüft, wenn der Schalter an ist.
export const PAYMENTS_ENABLED = false        // Abo, Bestellung, Kündigung, Widerruf, Zahlungsdienstleister
export const VOICE_MISTRAL_ENABLED = false   // Spracheingabe über Mistral (CODE-1: bis dahin aus)

// ---------------------------------------------------------------------------
// Stammdaten: einmal hier pflegen, alle Texte unten übernehmen sie.
// ---------------------------------------------------------------------------
export const OPERATOR = {
  name: 'Jerome Houboi',
  address: 'Damer Str. 41, 41372 Niederkrüchten',
  email: 'jerome@houboi.de',
  phone: '01774482782',   // wie im Impressum
}

// Frist aus dem Supabase-Dashboard (Database → Backups) plus Puffer, siehe B10.
// Supabase: tägliche Sicherung, 7 Tage aufbewahrt (Dashboard → Database → Backups, 20.11.2026) + Puffer.
// Point-in-Time-Recovery ist NICHT aktiv. Wird das Add-on eingeschaltet, diese Frist neu prüfen.
export const BACKUP_DELETION = 'spätestens nach 14 Tagen'

// App-Routen (B3). Die Ziele müssen existieren.
export const LEGAL_LINKS = {
  privacy: { label: 'Datenschutzerklärung', href: '/datenschutz' },
  imprint: { label: 'Impressum', href: '/impressum' },
}

// ---------------------------------------------------------------------------
// KI-Hinweis im Chat (Art. 50 Abs. 1 KI-VO), dauerhaft klein unter dem Eingabefeld (B1).
// ---------------------------------------------------------------------------
export const CHAT_AI_NOTICE = 'Du schreibst mit einer KI.'

// Löschfenster im Profil (Paket K W4). Von Jerome freigegeben 20.11.2026; belegt: Anthropic Privacy Center
// (30 Tage, bei Verstoß gegen die Usage Policy länger), OpenAI „Your data“ (Missbrauchs-Logs bis 30 Tage).
// Leer lassen = Zeile wird nicht angezeigt.
export const AI_PROVIDER_RETENTION_NOTE = 'Inhalte, die an die KI-Anbieter übertragen wurden, löschen diese in der Regel nach 30 Tagen.'

// ---------------------------------------------------------------------------
// Notfall-Hinweis: Vereinbarung, Profil (B4). Nummern passend zur Krisenantwort im Chat.
// ---------------------------------------------------------------------------
export const NOT_EMERGENCY = {
  short: 'Der Begleiter ist kein Notfalldienst. In einer akuten Krise: Notruf 112 oder TelefonSeelsorge 0800 111 0 111 (rund um die Uhr, kostenlos).',
  full: [
    'Der Begleiter ist kein Notfalldienst, und niemand liest deine Gespräche live mit. Ich kann deshalb nicht in Echtzeit reagieren.',
    'Wenn es dir akut schlecht geht oder du daran denkst, dir das Leben zu nehmen, hol dir bitte sofort Hilfe:',
  ],
  contacts: [
    'Notruf (Rettungsdienst): 112',
    'Polizei: 110',
    'TelefonSeelsorge: 0800 111 0 111, 0800 111 0 222 oder 116 123 (rund um die Uhr, kostenlos und anonym)',
    'Ärztlicher Bereitschaftsdienst: 116 117',
  ],
}

// ---------------------------------------------------------------------------
// Screen 3 – Kurzfassung der Vereinbarung (Konzept 2.4). Darunter LEGAL_LINKS.
// ---------------------------------------------------------------------------
export const AGREEMENT_SUMMARY = {
  title: 'Bevor wir anfangen',
  intro: 'Kurz und ehrlich, damit du weißt, worauf du dich einlässt.',
  points: [
    'Den Begleiter verantworte ich, Jerome Houboi. Die Antworten erzeugt eine KI nach den Prinzipien systemischen Coachings.',
    'Deine Gespräche werden gespeichert. Damit der Begleiter antworten kann, gehen sie verschlüsselt an KI-Anbieter in den USA und werden dort verarbeitet. Die Anbieter nutzen sie nicht, um ihre KI zu trainieren.',
    'Damit der Begleiter besser wird, lernt die KI aus allen Gesprächen allgemein, was hilft, ohne Zitate und ohne Angaben zu dir. Darüber hinaus nur, wenn du im Profil ausdrücklich zustimmst.',
    'Als Betreiber habe ich technischen Zugang zu deinen Gesprächen. Ich sehe nur hinein, wenn du mich darum bittest, ein technischer Fehler es erfordert oder ich gesetzlich dazu verpflichtet bin. Erkennt die App Hinweise auf eine Krise, speichert sie einen kurzen Ausschnitt, den ich mir später ansehe.',
    'Der Begleiter ist kein Notfalldienst, und niemand liest live mit. Wenn es dir akut schlecht geht: Notruf 112 oder TelefonSeelsorge 0800 111 0 111 (rund um die Uhr, kostenlos).',
    'Du kannst deine Daten jederzeit herunterladen und dein Konto mit allen Daten löschen.',
  ],
}

// ---------------------------------------------------------------------------
// Die beiden getrennten Häkchen (Konzept 2.4). 18+ ist vorher bestätigt.
// ---------------------------------------------------------------------------
export const AGREEMENT_CHECKBOX = 'Ich habe die Coaching-Vereinbarung gelesen und stimme ihr zu.'

export const CONSENT_ART9_CHECKBOX = 'Ich willige ausdrücklich ein, dass die App meine Gespräche speichert und auswertet, auch die darin enthaltenen Angaben zu meiner seelischen Gesundheit und zu anderen sensiblen Lebensbereichen. Das ist nötig, damit der Begleiter mich über mehrere Gespräche hinweg begleiten, mir meinen Spiegel und meine Erkenntnisse zeigen und Hinweise auf eine Krise erkennen kann. Außerdem darf die KI aus meinen Gesprächen allgemein lernen, was im Coaching hilft, ohne Zitate und ohne Angaben zu mir. Dafür werden die Inhalte auch an KI-Anbieter in den USA übermittelt.'   // Prüfpunkt R3

export const CONSENT_WITHDRAWAL = `Du kannst diese Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen, indem du dein Konto löschst oder mir an ${OPERATOR.email} schreibst. Ohne Einwilligung lässt sich der Begleiter nicht weiter nutzen. Deine Daten werden dann gelöscht, ${BACKUP_DELETION} auch aus den Sicherungskopien. Was bis zum Widerruf verarbeitet wurde, bleibt rechtmäßig.`

// ---------------------------------------------------------------------------
// Lernbasis (Opt-in im Profil). Ersetzt den bisherigen Text am Schalter im Profil.
// Eigene, freiwillige Einwilligung nach Art. 9 Abs. 2 lit. a DSGVO.
// ---------------------------------------------------------------------------
export const LEARNING_OPT_IN = {
  title: 'Andere mit deinen Erfahrungen unterstützen',
  text: 'Wenn du zustimmst, entstehen aus deinen Gesprächen Erfahrungen, die dem Begleiter auch in Gesprächen mit anderen Menschen helfen. Sie werden so aufbereitet, dass sie keine Namen, Orte oder Details zu einer Krise enthalten. Eine KI prüft das, bevor eine Erfahrung gespeichert wird. Damit die App passende Erfahrungen findet, gehen sie auch an OpenAI (USA). Die Zustimmung ist freiwillig. Der Begleiter funktioniert für dich auch ohne sie genauso.',
  checkbox: 'Ich willige ausdrücklich ein, dass aus meinen Gesprächen, auch aus Angaben zu meiner seelischen Gesundheit, aufbereitete Erfahrungen für die Lernbasis entstehen und dafür an OpenAI (USA) übermittelt werden.',
  withdrawal: 'Du kannst diese Zustimmung hier jederzeit zurücknehmen. Deine Erfahrungen werden dann gelöscht.',
}

// ---------------------------------------------------------------------------
// „Lieber nicht“ (neue Nutzer)
// ---------------------------------------------------------------------------
export const DECLINE_NEW = {
  title: 'Das ist völlig in Ordnung.',
  text: 'Der Begleiter lebt davon, dass er sich an deine Gespräche erinnert. Ohne diese Zustimmung lässt er sich deshalb nicht nutzen.',
  alternativesIntro: 'Vielleicht passt etwas anderes für dich:',
  alternatives: [
    { label: 'Mehr über systemisches Denken auf friedensstifter.coach', href: 'https://www.friedensstifter.coach/' },
    { label: 'Das Buch „Friedensstifter“', href: 'https://www.friedensstifter.coach/' },
    { label: 'Ein persönliches Gespräch mit Jerome', href: 'https://www.friedensstifter.coach/contact/' }, // D4: prüfen, ob die Seite existiert
  ],
}

// ---------------------------------------------------------------------------
// Bestandsnutzer (Re-Consent). pendingText = Variante 1 aus A8 (Text folgt dem Code).
// Die letzten zwei Sätze nur, wenn der Ablauf aus B9 schriftlich steht.
// ---------------------------------------------------------------------------
export const RECONSENT = {
  title: 'Wir haben die Vereinbarung überarbeitet',
  declineTitle: 'Das ist in Ordnung.',
  declineText: 'Ohne deine Zustimmung lässt sich der Begleiter nicht weiter nutzen. Du kannst vorher deine Daten herunterladen und dein Konto löschen.',
  pendingText: 'Bis du dich entschieden hast, ist die App für dich pausiert. Erreichbar bleiben dein Profil, der Download deiner Daten und das Löschen deines Kontos. Deine bisherigen Daten bleiben so lange gespeichert. Entscheidest du dich nicht, schreibe ich dir nach zwei Wochen eine E-Mail. Kommt danach innerhalb von weiteren vier Wochen keine Antwort, lösche ich dein Konto mit allen Daten.',
}

// ---------------------------------------------------------------------------
// Abo und Kennenlernen
// ---------------------------------------------------------------------------
export const SUBSCRIPTION = {
  title: 'Begleitung',
  freeTier: 'Zum Kennenlernen kannst du drei Gespräche kostenlos beginnen. Ein Gespräch umfasst dabei höchstens 100 Nachrichten. Dein Spiegel und deine Erkenntnisse bleiben auch danach kostenlos sichtbar.',
  scope: 'Mit der Begleitung kannst du neue Gespräche mit dem Begleiter führen. [Prüfen: Leistungsumfang, z. B. Gesprächs- oder Nachrichtenlimit im Abo]',
  price: 'Die Begleitung kostet [Offen: Betrag] Euro pro Monat. [Offen: „inklusive Umsatzsteuer“ oder Hinweis auf die Kleinunternehmerregelung nach § 19 UStG]',
  term: 'Das Abo läuft jeweils einen Monat und verlängert sich automatisch um einen weiteren Monat, wenn du nicht kündigst. Du zahlst monatlich im Voraus über [Offen: Zahlungsdienstleister].',
  cancellation: 'Du kannst jederzeit zum Ende des laufenden Monats kündigen, mit wenigen Klicks in deinem Profil unter „Verträge hier kündigen“. Danach bleiben dein Spiegel und deine Erkenntnisse sichtbar. Neue Gespräche sind dann nicht mehr möglich.',
  withdrawalHint: 'Als Verbraucher hast du ein 14-tägiges Widerrufsrecht. Die Einzelheiten stehen in der Widerrufsbelehrung.',
}

// A2 / CODE-1: erst aufnehmen, wenn die Spracheingabe über Mistral läuft.
export const VOICE_MISTRAL_NOTE = 'Nutzt du die Spracheingabe, geht deine Aufnahme an Mistral AI (Frankreich, EU) und wird dort in Text umgewandelt. [Offen: erst aufnehmen, wenn die Spracheingabe über Mistral läuft]'

// ---------------------------------------------------------------------------
// Voller Vereinbarungstext v2.0 – ENTWURF
// Abschnitte mit paymentOnly: true erst anzeigen, wenn die Zahlung live ist (CODE-5).
// Zum Anzeigen getAgreementSections() verwenden.
// ---------------------------------------------------------------------------
export const AGREEMENT_FULL = [
  {
    heading: 'Was du hier nutzt',
    paragraphs: [
      'Der Coaching-Begleiter dieser App wurde von mir, Jerome Houboi, zertifizierter systemischer Coach, entwickelt und wird von mir verantwortet. Die Antworten erzeugt eine KI auf Basis der Prinzipien systemischen Coachings. Ich bin der Mensch hinter diesem Angebot.',
      'Der Begleiter ist ein KI-System. Er kann sich irren, dich missverstehen oder unpassend antworten. Seine Antworten sind Anregungen zum Nachdenken, keine Ratschläge oder Anweisungen. Was du daraus machst, entscheidest du selbst.',
    ],
  },
  {
    heading: 'Für wen der Begleiter gedacht ist',
    paragraphs: [
      'Der Begleiter ist für Erwachsene ab 18 Jahren. Mit deiner Anmeldung bestätigst du, dass du mindestens 18 Jahre alt bist.',
      'Er ersetzt keine Psychotherapie, keine psychiatrische Behandlung und keine medizinische Beratung, und er stellt keine Diagnosen. Bei ernsthaften psychischen Beschwerden wende dich bitte an eine Fachkraft, zum Beispiel an deine Hausärztin oder deinen Hausarzt.',
      ...NOT_EMERGENCY.full,
    ],
    points: NOT_EMERGENCY.contacts,
  },
  {
    heading: 'Was mit deinen Daten passiert',
    paragraphs: [
      'Als Betreiber dieser App habe ich technischen Zugang zu den Inhalten deiner Gespräche. Ich verpflichte mich, sie vertraulich zu behandeln. Das bedeutet konkret:',
    ],
    points: [
      // A6
      'Ich lese deine Gespräche nicht. Ausnahmen: Du bittest mich darum, ein technischer Fehler erfordert meinen Eingriff, ich bin gesetzlich dazu verpflichtet, oder es geht um einen Krisenausschnitt (siehe unten). Technisch habe ich über die Verwaltung der Datenbank Zugriff auf alle gespeicherten Daten. Diese Zugriffe werden derzeit nicht gesondert protokolliert.',
      // A5
      'Erkennt die App in einem Gespräch Hinweise auf eine akute Krise, zeigt sie dir Hilfsangebote und speichert einen kurzen Ausschnitt deiner Nachricht (höchstens 300 Zeichen). Diesen sehe ich mir später an, um zu prüfen, ob die Krisenerkennung richtig angeschlagen hat, und um sie zu verbessern. Ich kann dabei nicht in Echtzeit reagieren. Der Ausschnitt wird nach meiner Sichtung gelöscht, spätestens nach 90 Tagen.',
      'Dass es einen solchen Hinweis gab (Zeitpunkt und Einstufung, ohne deinen Text), bleibt bis zum Ende des dritten Jahres danach gespeichert. So kann ich nachweisen, dass die App Hilfsangebote gezeigt hat. Löschst du dein Konto, wird auch dieser Eintrag sofort gelöscht.',   // Prüfpunkt R4
      // A3
      'Ich nutze deine Inhalte, damit der Begleiter für dich funktioniert. Dazu gehört, dass die App deine Gespräche auswertet, um dir deinen Spiegel und deine Erkenntnisse zu zeigen. Für Werbung nutze ich sie nicht, und ich verkaufe sie nicht.',
      'Damit der Begleiter insgesamt besser wird, hält die KI nach jedem Gespräch kurz fest, was geholfen hat und was gefehlt hat, ohne Namen, Zitate und andere Angaben, die dich erkennbar machen. Einmal pro Woche fasst sie diese Notizen aus allen Gesprächen zu allgemeinen Empfehlungen zusammen, die in die Antworten des Begleiters für alle einfließen. Die Notizen werden mit deinem Konto gelöscht, spätestens nach 12 Monaten. Die Empfehlungen werden nach 24 Monaten gelöscht.',
      'Nur wenn du im Profil zustimmst: Aus deinen Gesprächen entstehen Erfahrungen, die dem Begleiter auch in Gesprächen mit anderen Menschen helfen. Sie werden so aufbereitet, dass sie keine Namen, Orte oder Details zu einer Krise enthalten. Eine KI prüft das, bevor eine Erfahrung gespeichert wird. Nimmst du die Zustimmung zurück, werden deine Erfahrungen gelöscht.',
      // Dienstleister
      'Technische Dienstleister verarbeiten deine Daten nur in meinem Auftrag und sind vertraglich an meine Weisungen gebunden. Damit der Begleiter antworten kann, gehen deine Gesprächsinhalte verschlüsselt an Anthropic (USA). Zur Verarbeitung liegen sie dort lesbar vor.',
      // A4
      'Nutzt die App die Lernbasis, geht die erste Nachricht eines Gesprächs zusätzlich an OpenAI (USA). Daraus wird ein Zahlenwert berechnet, mit dem die App passende Erfahrungen findet. Hast du der Lernbasis zugestimmt, gehen auch die aufbereiteten Erfahrungen aus deinen Gesprächen an OpenAI.',
      'Die Übermittlung in die USA ist über die EU-Standardvertragsklauseln abgesichert, die in den Verträgen mit Anthropic und OpenAI vereinbart sind. In den USA gilt dennoch ein anderes Datenschutzniveau als in der EU, und Behörden können dort unter bestimmten Voraussetzungen auf Daten zugreifen.',
      'Beide KI-Anbieter nutzen deine Inhalte nach ihren Vertragsbedingungen nicht, um ihre KI-Modelle zu trainieren. Sie speichern sie höchstens befristet, zum Beispiel um Missbrauch zu erkennen.',
      // Belegt 20.11.2026: Anthropic Commercial Terms (gültig ab 17.06.2025) B: „Anthropic may not train models on
      // Customer Content“; privacy.claude.com Art. 7996866: API-Daten nach 30 Tagen gelöscht, bei Verstoß gegen die
      // Usage Policy bis 2 Jahre. OpenAI „Your data“ (developers.openai.com): kein Training, Missbrauchs-Logs bis 30 Tage,
      // auch /v1/embeddings.
      // A2 / CODE-1: nur mit VOICE_MISTRAL_ENABLED (Text in VOICE_MISTRAL_NOTE)
      ...(VOICE_MISTRAL_ENABLED ? [VOICE_MISTRAL_NOTE] : []),
      'Welche Dienstleister welche Daten wozu erhalten, steht vollständig in der Datenschutzerklärung.',
      'Ich behandle deine Inhalte auch nach dem Ende der Nutzung vertraulich. Anders als Ärztinnen, Ärzte oder Psychotherapeuten unterliege ich keiner gesetzlichen Schweigepflicht. Meine Vertraulichkeit beruht auf dieser Vereinbarung. Sie gilt nicht, wenn ich gesetzlich zur Herausgabe verpflichtet bin, etwa gegenüber einem Gericht.',
    ],
  },
  {
    heading: 'Deine Rechte',
    paragraphs: [
      'Nach der Datenschutz-Grundverordnung hast du jederzeit das Recht,',
    ],
    points: [
      'Auskunft über deine gespeicherten Daten zu bekommen (Art. 15 DSGVO),',
      'falsche Daten berichtigen zu lassen (Art. 16 DSGVO),',
      'deine Daten löschen zu lassen (Art. 17 DSGVO), direkt in der App über „Konto löschen“,',
      'die Verarbeitung einschränken zu lassen (Art. 18 DSGVO),',
      'deine Daten in einem gängigen Format zu erhalten (Art. 20 DSGVO), direkt in der App über „Daten herunterladen“,',
      'der Verarbeitung zu widersprechen, soweit sie auf meinem berechtigten Interesse beruht, etwa bei Sicherheitsprotokollen (Art. 21 DSGVO),',
      'deine Einwilligung jederzeit mit Wirkung für die Zukunft zu widerrufen (Art. 7 Abs. 3 DSGVO),',
      'dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren (Art. 77 DSGVO), zum Beispiel bei der Landesbeauftragten für Datenschutz und Informationsfreiheit Nordrhein-Westfalen.',
    ],
    // B2: closing wird noch nicht gerendert.
    closing: [
      `Schreib mir dafür einfach an ${OPERATOR.email}.`,
      // A7
      `Löschst du dein Konto, werden deine Daten sofort aus der App entfernt und ${BACKUP_DELETION} auch aus den Sicherungskopien gelöscht. Technische Protokolle ohne Inhalte bleiben noch bis zu 30 Tage, dann ohne Verbindung zu deinem Konto. Allgemeine Empfehlungen für den Begleiter, in die Notizen aus deinen Gesprächen eingeflossen sind, bleiben bis zu 24 Monate. Sie lassen sich dir nicht zuordnen.`,
    ],
  },
  {
    heading: 'Kennenlernen',
    paragraphs: [SUBSCRIPTION.freeTier],
  },
  {
    heading: 'Kosten, Laufzeit und Kündigung',
    paymentOnly: true,
    paragraphs: [
      SUBSCRIPTION.scope, SUBSCRIPTION.price, SUBSCRIPTION.term,
      SUBSCRIPTION.cancellation, SUBSCRIPTION.withdrawalHint,
    ],
    points: [
      'Ändere ich den Leistungsumfang des Abos zu deinem Nachteil, kündige ich das vorher an. Du kannst dann ohne Kosten kündigen. [Prüfen: § 327r BGB]',
      'Stimmst du einer neuen Fassung dieser Vereinbarung nicht zu, kannst du ein laufendes Abo [Offen: sofort mit anteiliger Erstattung oder zum Ende des Abrechnungszeitraums] beenden. Dasselbe gilt, wenn du deine Einwilligung widerrufst.',
      'Ich kann ein bezahltes Abo zum Ende des laufenden Abrechnungszeitraums mit einer Frist von [Offen: z. B. einem Monat] kündigen.',
    ],
  },
  {
    heading: 'Verfügbarkeit und Weiterentwicklung',
    paragraphs: [
      'Ich entwickle den Begleiter laufend weiter. Dabei können sich einzelne Funktionen ändern.',
      'Ich bemühe mich um eine hohe Verfügbarkeit. Wartung oder Störungen bei Dienstleistern können zu kurzen Unterbrechungen führen. Deine gesetzlichen Rechte bei Mängeln bleiben unberührt.',
    ],
  },
  {
    heading: 'Änderungen dieser Vereinbarung',
    paragraphs: [
      'Ändere ich diese Vereinbarung, zeige ich dir die neue Fassung in der App, bevor sie gilt. Sie gilt erst, wenn du zustimmst. Stimmst du nicht zu, kannst du deine Daten herunterladen und dein Konto löschen.',
    ],
  },
  {
    heading: 'Haftung',
    points: [
      'Ich hafte unbeschränkt bei Vorsatz und grober Fahrlässigkeit, bei einer Verletzung von Leben, Körper oder Gesundheit und nach dem Produkthaftungsgesetz.',
      'Bei leichter Fahrlässigkeit hafte ich nur, wenn ich eine wesentliche Vertragspflicht verletze. Das ist eine Pflicht, deren Erfüllung die Nutzung des Begleiters überhaupt erst möglich macht und auf die du dich deshalb verlassen darfst. Die Haftung ist dann auf den typischen, vorhersehbaren Schaden begrenzt.',
      'Für kostenlose Leistungen hafte ich nur bei Vorsatz und grober Fahrlässigkeit sowie bei einer Verletzung von Leben, Körper oder Gesundheit.',   // Prüfpunkt R5
    ],
  },
  {
    heading: 'Wann die Vereinbarung endet',
    points: [
      'Du kannst die Vereinbarung jederzeit beenden, indem du dein Konto löschst.',
      'Ich kann ein kostenloses Konto mit einer Frist von zwei Wochen kündigen. Ich informiere dich per E-Mail, damit du deine Daten vorher herunterladen kannst.',
      'Bei schwerem Missbrauch, etwa bei Angriffen auf die App oder einer Nutzung für rechtswidrige Zwecke, kann ich dein Konto sperren und fristlos kündigen.',
    ],
  },
  {
    heading: 'Schlussbestimmungen',
    paragraphs: [
      'Es gilt deutsches Recht. Zwingende Verbraucherschutzvorschriften des Landes, in dem du lebst, bleiben davon unberührt.',
    ],
  },
]

export const AGREEMENT_SIGNATURE = { name: 'Jerome Houboi', role: 'Zertifizierter systemischer Coach' }

/** Abschnitte zum Anzeigen. Abo-Abschnitte nur, wenn die Zahlung live ist (CODE-5). */
export function getAgreementSections({ paymentsEnabled = PAYMENTS_ENABLED } = {}) {
  return AGREEMENT_FULL.filter(s => paymentsEnabled || !s.paymentOnly)
}

// ---------------------------------------------------------------------------
// Bestellung (§ 312j BGB) – erst mit der Abo-Tranche (B7)
// ---------------------------------------------------------------------------
export const CHECKOUT = {
  summaryTitle: 'Deine Bestellung',
  summaryLines: [
    'Begleitung: neue Gespräche mit dem Begleiter [Prüfen: Leistungsumfang wie in SUBSCRIPTION.scope]',
    'Preis: [Offen: Betrag] Euro pro Monat',
    'Laufzeit: 1 Monat, verlängert sich jeweils um einen Monat, jederzeit zum Monatsende kündbar',
  ],
  legalNote: 'Es gelten die Coaching-Vereinbarung und die Widerrufsbelehrung. Hinweise zum Datenschutz findest du in der Datenschutzerklärung.',
  earlyStartCheckbox: 'Ich möchte, dass die Begleitung sofort beginnt, also schon vor Ablauf der 14-tägigen Widerrufsfrist. Mir ist bekannt, dass ich bei einem Widerruf für die bis dahin erbrachte Leistung anteilig bezahle.',
  orderButton: 'Zahlungspflichtig bestellen',
  confirmationHint: 'Du bekommst gleich eine E-Mail mit der Bestellbestätigung, der Coaching-Vereinbarung und der Widerrufsbelehrung.',
}

// ---------------------------------------------------------------------------
// Kündigungsbutton (§ 312k BGB) – erst mit der Abo-Tranche (B7)
// ---------------------------------------------------------------------------
export const CANCELLATION = {
  entryButton: 'Verträge hier kündigen',
  title: 'Abo kündigen',
  intro: 'Hier kannst du dein Abo „Begleitung“ kündigen. Deine Daten, dein Spiegel und deine Erkenntnisse bleiben erhalten, bis du dein Konto löschst.',
  typeLabel: 'Art der Kündigung',
  typeOrdinary: 'Ordentlich zum nächstmöglichen Zeitpunkt',
  typeExtraordinary: 'Außerordentlich (fristlos) aus wichtigem Grund',
  reasonLabel: 'Grund (nur bei außerordentlicher Kündigung)',
  dateLabel: 'Gewünschter Zeitpunkt',
  emailLabel: 'E-Mail-Adresse für die Bestätigung',
  confirmButton: 'Jetzt kündigen',
  success: 'Deine Kündigung ist eingegangen. Dein Abo endet am {endDate}. Die Bestätigung schicke ich dir an {email}.',
}

// ---------------------------------------------------------------------------
// Widerrufsbelehrung für Dienstleistungen (Muster nach Anlage 1 zu Art. 246a § 1 Abs. 2
// EGBGB), bewusst in der Sie-Form und nah am Mustertext (Gesetzlichkeitsfiktion).
// Ob „ich/mich“ statt „wir/uns“ unschädlich ist, mit dem Anwalt klären.
// ---------------------------------------------------------------------------
export const WITHDRAWAL_POLICY = {
  title: 'Widerrufsbelehrung',
  sections: [
    {
      heading: 'Widerrufsrecht',
      paragraphs: [
        'Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.',
        'Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.',
        `Um Ihr Widerrufsrecht auszuüben, müssen Sie mich (${OPERATOR.name}, ${OPERATOR.address}, Telefon: ${OPERATOR.phone}, E-Mail: ${OPERATOR.email}) mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das beigefügte Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.`,
        'Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.',
      ],
    },
    {
      heading: 'Folgen des Widerrufs',
      paragraphs: [
        'Wenn Sie diesen Vertrag widerrufen, habe ich Ihnen alle Zahlungen, die ich von Ihnen erhalten habe, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass Sie eine andere Art der Lieferung als die von mir angebotene, günstigste Standardlieferung gewählt haben), unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei mir eingegangen ist. Für diese Rückzahlung verwende ich dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte berechnet.',
        'Haben Sie verlangt, dass die Dienstleistungen während der Widerrufsfrist beginnen sollen, so haben Sie mir einen angemessenen Betrag zu zahlen, der dem Anteil der bis zu dem Zeitpunkt, zu dem Sie mich von der Ausübung des Widerrufsrechts hinsichtlich dieses Vertrags unterrichten, bereits erbrachten Dienstleistungen im Vergleich zum Gesamtumfang der im Vertrag vorgesehenen Dienstleistungen entspricht.',
      ],
    },
  ],
  end: 'Ende der Widerrufsbelehrung',
}

// Muster-Widerrufsformular (Anlage 2 zu Art. 246a § 1 Abs. 2 EGBGB), unverändert.
export const WITHDRAWAL_FORM = {
  title: 'Muster-Widerrufsformular',
  intro: '(Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses Formular aus und senden Sie es zurück.)',
  lines: [
    `– An ${OPERATOR.name}, ${OPERATOR.address}, E-Mail: ${OPERATOR.email}:`,
    '– Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der folgenden Waren (*)/die Erbringung der folgenden Dienstleistung (*)',
    '– Bestellt am (*)/erhalten am (*)',
    '– Name des/der Verbraucher(s)',
    '– Anschrift des/der Verbraucher(s)',
    '– Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)',
    '– Datum',
  ],
  footnote: '(*) Unzutreffendes streichen.',
}

// ---------------------------------------------------------------------------
// Empfänger personenbezogener Daten – Grundlage für die Datenschutzerklärung
// (Art. 13 Abs. 1 lit. e und f DSGVO). Wird in der App nicht direkt angezeigt.
// ---------------------------------------------------------------------------
export const DATA_RECIPIENTS = [
  {
    // Quelle: Anthropic DPA, wirksam ab 24.02.2025 (docs/DPA/Anthropic DPA.pdf)
    name: 'Anthropic (Vertragspartner für die EU: Anthropic Ireland, Limited)',
    location: 'Irland (Vertragspartner), Verarbeitung in den USA',
    purpose: 'Antworten des Begleiters; Auswertung für Spiegel, Erkenntnisse, Krisenerkennung, Reflexionen und Supervision; Prüfung der Lernbasis-Einträge',
    data: 'Gesprächsinhalte und Kontext aus früheren Gesprächen',
    safeguard: 'Auftragsverarbeitungsvertrag (Anthropic DPA vom 24.02.2025) mit EU-Standardvertragsklauseln (Modul 2, Abschnitt I). Vertragspartner für Kunden in der EU: Anthropic Ireland, Limited (Commercial Terms).',   // Prüfpunkt R1
  },
  {
    // Quelle: OpenAI DPA v.010126 (docs/DPA/OpenAI DPA.pdf)
    name: 'OpenAI (Vertragspartner für die EU: OpenAI Ireland Ltd.)',
    location: 'Irland (Vertragspartner), Verarbeitung auch in den USA',
    purpose: 'Berechnung von Zahlenwerten (Vektoren), um passende Erfahrungen aus der Lernbasis zu finden; nur solange die Lernbasis genutzt wird',
    data: 'Erste Nachricht eines Gesprächs (bis 2.000 Zeichen); mit Zustimmung zur Lernbasis zusätzlich aufbereitete Erfahrungen',
    safeguard: 'Auftragsverarbeitungsvertrag (OpenAI DPA v.010126). Weitergabe in die USA über EU-Standardvertragsklauseln oder einen Angemessenheitsbeschluss (Ziffer 4.1).',   // Prüfpunkt R2
  },
  {
    // Quelle: Supabase DPA Version 1 vom 01.08.2026 (docs/DPA/Supabase DPA.pdf)
    name: 'Supabase (Vertragspartner: Supabase Pte. Ltd., Singapur)',
    location: 'Rechenzentrum in Irland (EU, Region eu-west-1); Vertragspartner in Singapur, Betreuung weltweit',
    purpose: 'Datenbank, Anmeldung, Serverfunktionen',
    data: 'Alle in der App gespeicherten Daten',
    safeguard: 'Auftragsverarbeitungsvertrag (Supabase DPA vom 01.08.2026) mit EU-Standardvertragsklauseln (Modul 2, Ziffer 12). Speicherung und Verarbeitung im Wesentlichen in der gewählten Region (Ziffer 6.1). Besondere Kategorien wie Gesundheitsdaten sind im Vertrag ausdrücklich vorgesehen (Anlage 3).',
  },
  {
    // Quelle: Vercel DPA vom 17.03.2026, gültig ab 31.03.2026 (docs/DPA/Vercel DPA.pdf)
    name: 'Vercel Inc.',
    location: 'USA',
    purpose: 'Auslieferung der App',
    data: 'Technische Zugriffsdaten wie IP-Adresse, keine Gesprächsinhalte',   // geprüft: App spricht direkt mit Supabase
    safeguard: 'Auftragsverarbeitungsvertrag (Vercel DPA vom 17.03.2026) mit EU-Standardvertragsklauseln (Modul 2). Nutzungs- und Zugriffsdaten verarbeitet Vercel teilweise als eigener Verantwortlicher (Ziffer 4.b).',   // DPA gilt nur für Pro/Enterprise – Team auf Pro-Plan, von Jerome bestätigt 20.11.2026
  },
  {
    requires: 'mistral',
    name: 'Mistral AI',
    location: 'Frankreich (EU)',
    purpose: 'Spracheingabe (Umwandlung von Sprache in Text)',
    data: 'Sprachaufnahmen, wenn du die Spracheingabe nutzt',
    safeguard: 'Verarbeitung in der EU [Offen: erst aufnehmen, wenn die Spracheingabe über Mistral läuft]',
  },
  {
    requires: 'payments',
    name: '[Offen: Zahlungsdienstleister]',
    location: '[Offen]',
    purpose: 'Abwicklung der Zahlungen für das Abo',
    data: 'Name, E-Mail-Adresse, Zahlungsdaten',
    safeguard: '[Offen]',
  },
  {
    // Supabase Auth → SMTP Settings: send.one.com:465, Absender hallo@friedensstifter.coach (20.11.2026)
    name: 'one.com (E-Mail-Postfach hallo@friedensstifter.coach)',
    // Quelle: one.com DPA vom 17.06.2025 (docs/DPA/One.com DPA.pdf), Anlage 1 und 3
    location: 'Dänemark (EU, Rechenzentrum Kopenhagen); Zugriff zur Systemüberwachung auch aus Indien',
    purpose: 'Versand von Anmelde-, Bestätigungs- und Erinnerungs-E-Mails',
    data: 'E-Mail-Adresse, Inhalt der E-Mail',
    safeguard: 'Auftragsverarbeitungsvertrag (one.com DPA, Fassung vom 17.06.2025). Für den Zugriff aus Indien (One.com India) sieht der Vertrag geeignete Garantien wie die EU-Standardvertragsklauseln vor.',   // Postfach gehört zum Webhosting („Mass hosting product“, Anlage 3), von Jerome bestätigt 20.11.2026
  },
]

// ---------------------------------------------------------------------------
// Für die Build-Prüfung: sammelt rekursiv alle Strings aller Rechtstexte ein.
// Neue Exporte hier in die Liste aufnehmen.
// ---------------------------------------------------------------------------
function collectStrings(value, out) {
  if (typeof value === 'string') out.push(value)
  else if (Array.isArray(value)) value.forEach(v => collectStrings(v, out))
  else if (value && typeof value === 'object') Object.values(value).forEach(v => collectStrings(v, out))
  return out
}

/** Empfänger, deren Schalter an ist (bzw. ohne Schalter). */
export function activeDataRecipients() {
  const on = { payments: PAYMENTS_ENABLED, mistral: VOICE_MISTRAL_ENABLED }
  return DATA_RECIPIENTS.filter(r => !r.requires || on[r.requires])
}

/** Hilfsfunktion für die Build-Prüfung: alle aktiven Texte als eine Liste (CODE-6).
 *  Abo-Texte nur mit PAYMENTS_ENABLED, Mistral nur mit VOICE_MISTRAL_ENABLED. */
export function allLegalStrings() {
  const recipients = activeDataRecipients().map(({ requires, ...r }) => r)
  return collectStrings([
    OPERATOR, LEGAL_LINKS, CHAT_AI_NOTICE, AI_PROVIDER_RETENTION_NOTE, NOT_EMERGENCY,
    AGREEMENT_SUMMARY, AGREEMENT_CHECKBOX, CONSENT_ART9_CHECKBOX, CONSENT_WITHDRAWAL,
    LEARNING_OPT_IN, DECLINE_NEW, RECONSENT, SUBSCRIPTION.freeTier,
    getAgreementSections(), AGREEMENT_SIGNATURE, recipients,
    ...(PAYMENTS_ENABLED ? [SUBSCRIPTION, CHECKOUT, CANCELLATION, WITHDRAWAL_POLICY, WITHDRAWAL_FORM] : []),
    ...(VOICE_MISTRAL_ENABLED ? [VOICE_MISTRAL_NOTE] : []),
  ], [])
}
