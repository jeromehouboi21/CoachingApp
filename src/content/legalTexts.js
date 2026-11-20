// src/content/legalTexts.js — Rechtstexte des neuen Einstiegs (Paket K, W3 = R-1)
//
// ENTWURF. Claude Code schreibt keine Rechtstexte: Alles hier stammt aus dem Konzept
// (docs/konto/friedensstifter-konto-vertrauen-konzept-v1.md, 2.4) bzw. der Vereinbarung v1.0
// und wird von Jerome nach dem Anwaltstermin ersetzt.
// Stellen in [eckigen Klammern] sind offen. Die Build-Prüfung (scripts/security/check-content.mjs)
//   - bricht jeden Produktions-Build ab, solange LEGAL_TEXTS_APPROVED nicht true ist,
//   - bricht ab, wenn LEGAL_TEXTS_APPROVED true ist und noch eine [eckige Klammer] im Text steht.
// LEGAL_TEXTS_APPROVED setzt nur Jerome (J-K4). Claude Code ändert diesen Wert nie.

export const LEGAL_TEXTS_APPROVED = false

export const CONSENT_VERSION = '2.0'
export const AGREEMENT_VERSION = '2.0'

// Screen 3 – Kurzfassung der Vereinbarung (Konzept 2.4)
export const AGREEMENT_SUMMARY = {
  title: 'Bevor wir anfangen',
  intro: 'Kurz und ehrlich, damit du weißt, worauf du dich einlässt.',
  points: [
    'Den Begleiter verantworte ich, Jerome Houboi. Die Antworten erzeugt eine KI nach den Prinzipien systemischen Coachings.',
    'Deine Gespräche werden gespeichert. Damit der Begleiter antworten kann, gehen sie verschlüsselt an einen KI-Anbieter und werden dort verarbeitet.',
    'Als Betreiber habe ich technischen Zugang zu deinen Gesprächen. [Text aus R-1, z. B.: Ich sehe nur hinein, wenn ein technisches Problem oder ein Hinweis auf eine Krise es erfordert.]',
    'Du kannst deine Daten jederzeit herunterladen und dein Konto mit allen Daten löschen.',
  ],
}

// Die beiden getrennten Häkchen (Konzept 2.4, Art. 9 getrennt von der Vereinbarung)
export const AGREEMENT_CHECKBOX = 'Ich habe die Coaching-Vereinbarung gelesen und stimme ihr zu.'
export const CONSENT_ART9_CHECKBOX = 'Ich bin einverstanden, dass die App meine Gespräche und die darin enthaltenen persönlichen und emotionalen Inhalte speichert und verarbeitet, damit der Begleiter mich über mehrere Gespräche hinweg begleiten kann.'
export const CONSENT_WITHDRAWAL = 'Du kannst diese Einwilligung jederzeit widerrufen, indem du dein Konto löschst oder mir schreibst.'

// „Lieber nicht“ (neue Nutzer)
export const DECLINE_NEW = {
  title: 'Das ist völlig in Ordnung.',
  text: 'Der Begleiter lebt davon, dass er sich an deine Gespräche erinnert. Ohne diese Zustimmung lässt er sich deshalb nicht nutzen.',
  alternativesIntro: 'Vielleicht passt etwas anderes für dich:',
  // Ziel-Adressen: vorläufig alle die Startseite – Jerome trägt die genauen Seiten ein (Buch, Kontakt).
  alternatives: [
    { label: 'Mehr über systemisches Denken auf friedensstifter.coach', href: 'https://friedensstifter.coach/' },
    { label: 'Das Buch „Friedensstifter“', href: 'https://friedensstifter.coach/' },
    { label: 'Ein persönliches Gespräch mit Jerome', href: 'https://friedensstifter.coach/' },
  ],
}

// Bestandsnutzer (Re-Consent, Handoff 5.5)
export const RECONSENT = {
  title: 'Wir haben die Vereinbarung überarbeitet',
  declineTitle: 'Das ist in Ordnung.',
  declineText: 'Ohne deine Zustimmung lässt sich der Begleiter nicht weiter nutzen. Du kannst vorher deine Daten herunterladen und dein Konto löschen.',
}

// Voller Vereinbarungstext v2.0 – ENTWURF auf Basis von v1.0 (CoachingAgreementContent bis W3).
// Mit [Prüfen: …] markiert: Aussagen, die mit dem heutigen Stand nicht übereinstimmen.
export const AGREEMENT_FULL = [
  {
    heading: 'Was du hier nutzt',
    paragraphs: [
      'Der Coaching-Begleiter dieser App wurde von mir, Jerome Houboi, zertifizierter systemischer Coach, entwickelt und wird von mir verantwortet. Die Antworten erzeugt eine KI auf Basis der Prinzipien systemischen Coachings. Ich bin der Mensch hinter diesem Angebot.',
    ],
  },
  {
    heading: 'Was das für deine Daten bedeutet',
    paragraphs: [
      'Als Betreiber dieser App habe ich technischen Zugang zu den Inhalten deiner Gespräche, so wie ein Coach, der dein Gespräch führt, deine Themen kennt. Ich verpflichte mich, diese Inhalte vertraulich zu behandeln. Das bedeutet konkret:',
    ],
    points: [
      'Ich lese deine Gespräche nicht, außer bei einem technischen Problem, das meine direkte Intervention erfordert. [Prüfen: mit dem Satz zum Betreiberzugang aus R-1 abgleichen, z. B. Hinweis auf eine Krise]',
      'Ich gebe deine Inhalte nicht an Dritte weiter. [Prüfen: Damit der Begleiter antworten kann, gehen Gesprächsinhalte an Anthropic, die erste Nachricht eines Gesprächs zur Vektorberechnung an OpenAI – beide als Auftragsverarbeiter. Formulierung nach R-3]',
      'Ich nutze deine Inhalte nicht für Werbung, Analyse oder andere Zwecke.',
      'Diese Vertraulichkeit gilt auch nach Beendigung der Nutzung.',
    ],
  },
  {
    heading: 'Was dieser Begleiter nicht ist',
    paragraphs: [
      'Dieser Coaching-Begleiter ersetzt keine Psychotherapie, keine psychiatrische Behandlung und keine medizinische Beratung. Bei ernsthaften psychischen Beschwerden wende dich bitte an eine Fachkraft.',
    ],
  },
  {
    heading: 'Deine Rechte',
    paragraphs: [
      'Du kannst dein Konto und alle deine Daten jederzeit löschen und deine Daten vorher als Datei herunterladen. Diese Vereinbarung kann von dir jederzeit durch Löschung des Kontos beendet werden.',
    ],
  },
]

export const AGREEMENT_SIGNATURE = { name: 'Jerome Houboi', role: 'Zertifizierter systemischer Coach' }

/** Hilfsfunktion für die Build-Prüfung: alle Texte als eine Liste. */
export function allLegalStrings() {
  return [
    AGREEMENT_SUMMARY.title, AGREEMENT_SUMMARY.intro, ...AGREEMENT_SUMMARY.points,
    AGREEMENT_CHECKBOX, CONSENT_ART9_CHECKBOX, CONSENT_WITHDRAWAL,
    DECLINE_NEW.title, DECLINE_NEW.text, RECONSENT.title, RECONSENT.declineText,
    ...AGREEMENT_FULL.flatMap(s => [s.heading, ...(s.paragraphs ?? []), ...(s.points ?? [])]),
  ]
}
