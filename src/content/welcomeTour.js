// Einstiegs-Rundgang (Paket R): alle Texte an einer Stelle. Jerome kann sie hier ändern.
// Freigabe J-R1 (21.11.2026). Schritt 3 mit „sprechen“: Jerome, die Spracheingabe kommt vor dem Start.
// Sprachprinzip: kein „müssen“, kein absolutes „immer/nie“, keine Coaching-Vokabeln.

export const TOUR_STEPS = [
  {
    id: 'willkommen',
    eyebrow: 'Kurzer Rundgang',
    title: 'Schön, dass du ',
    titleEmphasis: 'da bist.',
    body: [
      'Hier findest du einen Begleiter, der dir zuhört und Fragen stellt. Ratschläge gibt er dir keine – die Antworten findest du selbst.',
      'In vier kurzen Schritten siehst du, wo du was findest. Dauert etwa eine Minute.',
    ],
    bullets: [],
    illustrationCaption: 'Drei Bereiche. Mehr braucht es nicht.',
  },
  {
    id: 'heute',
    eyebrow: 'Schritt 2 von 5',
    title: 'Heute – ',
    titleEmphasis: 'dein Startpunkt',
    // Handoff: „… zeigt dir immer nur das …“ – „immer“ als Absolutum entfernt (Sprachprinzip)
    body: ['Hier startest du. Heute zeigt dir nur das, was gerade dran ist.'],
    bullets: [
      { icon: 'sparkle', text: 'Ein Impuls für den Tag, wenn du nicht weißt, womit du anfangen sollst.' },
      { icon: 'lock', text: 'Ein Satz aus deinem letzten Gespräch. Verdeckt, bis du ihn antippst.' },
      { icon: 'pulse', text: '„Wie geht’s dir?“ – wenn du erst mal ankommen magst.' },
    ],
  },
  {
    id: 'gespraech',
    eyebrow: 'Schritt 3 von 5',
    title: 'Gespräch – ',
    titleEmphasis: 'dein Begleiter',
    body: ['Hier sprichst du mit deinem Begleiter über das, was dich bewegt. Tippen oder sprechen, wie es dir lieber ist.'],
    bullets: [
      { icon: 'message', text: 'Etwas Neues mitbringen oder ein früheres Gespräch weiterführen.' },
      { icon: 'quote', text: 'Am Ende fragt er dich: Was nimmst du heute mit?' },
      { icon: 'repeat', text: 'Du bestimmst Thema und Tempo. Pausieren geht jederzeit.' },
    ],
  },
  {
    id: 'spiegel',
    eyebrow: 'Schritt 4 von 5',
    title: 'Spiegel – ',
    titleEmphasis: 'was du erkennst',
    body: ['Was du in Gesprächen erkennst, sammelt sich hier, damit es nicht verloren geht.'],
    bullets: [
      { icon: 'quote', label: 'Erkenntnisse', text: 'deine Sätze, in deinen Worten' },
      { icon: 'repeat', label: 'Muster', text: 'was sich bei dir wiederholt' },
      { icon: 'trend', label: 'Entwicklung', text: 'wie du dich mit der Zeit bewegst' },
    ],
    // U5a (Deine Einschätzung) ist live
    footnote: 'Die App bewertet nichts. Wenn dich etwas weitergebracht hat, markierst du es selbst mit ✦.',
  },
  {
    id: 'kreislauf',
    eyebrow: 'Schritt 5 von 5',
    title: 'Ein Kreislauf, ',
    titleEmphasis: 'kein Programm.',
    body: ['Du kannst überall einsteigen und jederzeit pausieren. Nichts läuft dir davon.'],
    bullets: [],
    illustrationCaption: 'Im Alltag ausprobieren – und wiederkommen, wann du magst.',
    profileNote: 'Oben rechts findest du dein Profil: Konto, Sicherheit – und diesen Rundgang, falls du ihn noch mal sehen willst.',
    // Nur bei access_phase = 'kennenlernen' (R-3); {anzahl} kommt aus access.starts_limit
    kennenlernenNote: 'Zum Kennenlernen hast du {anzahl} Gespräche. Was du dabei erkennst, bleibt dir danach so oder so.',
  },
]

// Beispielinhalte der Grafiken: fest, nie echte Nutzerdaten (Handoff 0.3)
export const TOUR_EXAMPLES = {
  wordmark: 'Friedensstifter',
  areas: ['Heute', 'Gespräch', 'Spiegel'],
  todayGreeting: 'Guten Morgen',
  todayImpulseLabel: 'Tagesimpuls',
  todayImpulse: 'Was trägst du gerade mit dir, das eigentlich nicht dir gehört?',
  todayHidden: 'Aus deinem letzten Gespräch · Antippen zum Anzeigen',
  chat: [
    { role: 'assistant', text: 'Was beschäftigt dich gerade am meisten?' },
    { role: 'user', text: 'Ich sage bei der Arbeit zu schnell Ja.' },
    { role: 'assistant', text: 'Woran merkst du in dem Moment, dass es zu schnell war?' },
  ],
  chatPlaceholder: 'Schreiben oder sprechen …',
  mirrorTabs: ['Erkenntnisse', 'Muster', 'Entwicklung'],
  mirrorInsight: '„Ich darf erst fragen, bevor ich übernehme.“',
  mirrorInsightMeta: 'Erkenntnis · aus dem Gespräch vom 14.11.',
  mirrorRating: 'Deine Einschätzung ›',
  mirrorContinue: 'Daran weiterarbeiten →',
  mirrorSecond: '„Ich sag zu schnell Ja.“',
  cycle: ['Ankommen', 'Sprechen', 'Erkennen', 'Ausprobieren'],
}

const NUMBER_WORDS = ['null', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf']

// „drei“ statt „3“; unbekannt oder unbegrenzt → kein Satz
export function kennenlernenText(limit) {
  if (!Number.isInteger(limit) || limit < 2) return null
  const anzahl = NUMBER_WORDS[limit] ?? String(limit)
  return TOUR_STEPS[4].kennenlernenNote.replace('{anzahl}', anzahl)
}
