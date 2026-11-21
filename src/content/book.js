// T1 Buch-Seite: alle Texte und Links zum Buch an einer Stelle. Jerome kann sie hier ändern.
// Seitentext (BOOK_PAGE_TEXT): B-7, am 21.11.2026 freigegeben, wörtlich.
// Übrige Texte (BOOK_UI_TEXT): Handoff 5.2.
// Links ohne Affiliate-Parameter, kein Pixel.

// B1 stellt das auf true: dann entfällt der Hinweis T1-6, „Wie es funktioniert“ zeigt die zweite Fassung.
export const BOOK_REFERENCES_LIVE = false

export const BOOK = {
  title: 'Friedensstifter',
  subtitle: 'Zwei Nachbarn, ein Feldweg und sieben Gespräche',
  author: 'Jerome Houboi',
  ebookUrl: 'https://www.amazon.de/dp/B0HRZWBH1F',
  paperbackUrl: null,              // Nachtrag ab 27.11. (Handoff Abschnitt 8)
  paperbackReleaseLabel: '27.11.',
  coverSrc: '/buch-cover.webp',
  coverWidth: 600,
  coverHeight: 929,
  coverAlt: 'Buchcover von Friedensstifter: zwei Menschen von hinten auf einem Feldweg im Abendlicht',
}

// Teil-Titel aus dem Buch (Buch-Landkarte, Aufbau). Reihenfolge = book_progress.
export const BOOK_PARTS = [
  { n: 1, title: 'Was hast du gehört?' },
  { n: 2, title: 'Tausend kleine Tiger' },
  { n: 3, title: 'Die Kampagne' },
  { n: 4, title: 'Wo hast du das her?' },
  { n: 5, title: 'Seh ich anders' },
  { n: 6, title: 'Tausend Beweise am Tag' },
  { n: 7, title: 'Schon wieder' },
]

// Handoff 5.1 – freigegeben (B-7), wörtlich
export const BOOK_PAGE_TEXT = {
  header: 'Das Buch zur App',
  blurb: 'Tim hat schlechte Laune, und er weiß genau, warum: Sein Chef ist schuld. Mara wohnt zwei Häuser weiter, geht jeden Abend dieselbe Runde und stellt Fragen. Sieben Gespräche auf dem Feldweg, vom Herbst bis in den April. Nach jedem steige ich aus der Geschichte aus und erkläre, was dahintersteckt. Und ich erzähle, wo mir die Themen selbst begegnet sind.',
  appHeading: 'Was das mit dieser App zu tun hat',
  appText: 'Am Ende jedes Teils stehen im Buch ein paar Fragen an dich. Hier in der App kannst du weiterfragen lassen: Dein Begleiter stellt Fragen, so wie Mara. Wenn du das Buch kennst, erinnert er dich ab und zu an eine Szene zwischen Tim und Mara, die gerade passt, oder an etwas, das ich im Buch erzähle. Manchmal sieht man ein Muster bei Tim schneller als bei sich selbst. Und dann denkst du: Moment, das kenne ich.',
  quote: '„Ein guter Coach weiß das am Anfang auch nicht. Aber er kann fragen.“',
  quoteSource: '– aus dem Epilog',
  closing: ['Die App funktioniert auch ohne das Buch.', 'Mit dem Buch wird sie ein Stück reicher.'],
  ebookButton: 'Als E-Book (Kindle) →',
  paperbackButton: 'Als Taschenbuch →',
  paperbackPending: 'Als Taschenbuch · erscheint am {datum}',
  statusQuestion: 'Kennst du das Buch schon?',
  statusRead: 'Ja, durchgelesen',
  statusReading: 'Ich lese gerade',
  statusNotYet: 'Noch nicht',
  footer: 'Jerome Houboi · Systemischer Coach',
}

// Handoff 5.2
export const BOOK_UI_TEXT = {
  linksNote: 'Die Links führen zu Amazon.',
  progressQuestion: 'Bis wohin bist du gekommen?',
  partLabel: 'Teil {n} · {titel}',
  progressHint: 'Wähle den Teil, in dem du gerade bist.',
  saved: 'Gespeichert',
  error: 'Das hat nicht geklappt. Versuch es bitte noch einmal.',
  changeNote: 'Du kannst das jederzeit ändern, hier oder im Profil.',
  notLiveNote: 'Die Erinnerungen an Szenen aus dem Buch kommen in den nächsten Wochen dazu. Was du hier angibst, gilt dann schon.',
  // Profil-Karte
  cardEyebrow: 'Das Buch zur App',
  statusRead: 'Du hast das Buch gelesen',
  statusReading: 'Du liest gerade Teil {n}',
  statusNotYet: 'Noch nicht gelesen',
  changeLink: 'ändern ›',
  moreLink: 'Mehr zum Buch →',
  // „Wie es funktioniert“
  howtoHeading: 'Das Buch zur App',
  howtoLead: 'Zur App gibt es ein Buch: ',
  howtoTitle: 'Friedensstifter – Zwei Nachbarn, ein Feldweg und sieben Gespräche.',
  howtoText: ' Darin stellt Mara die Fragen, so wie hier dein Begleiter. Die App funktioniert auch ohne das Buch.',
  howtoTextLive: ' Darin stellt Mara die Fragen, so wie hier dein Begleiter. Wenn du das Buch kennst, erinnert er dich ab und zu an eine passende Szene. Die App funktioniert auch ohne das Buch.',
  // Heute, Zustand A
  todayLink: 'Zur App gibt es auch ein Buch →',
}
