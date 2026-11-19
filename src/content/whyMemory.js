// src/content/whyMemory.js — „Warum sich die App etwas merkt“ (Paket K, W2; Konzept 3.2/3.3)
// Variante ohne „musst“ (Sprachprinzip). Wird in „Wie es funktioniert“ genutzt und in W3 als Screen 2 des Einstiegs.

// Datenexport (S-16) ist seit Paket C-4 live → „im Datenexport“ statt „auf Anfrage bei Jerome“
export const EXPORT_AVAILABLE = true

export const WHY_MEMORY = {
  titleStart: 'Warum sich die App etwas',
  titleEmphasis: 'merkt.',
  intro: [
    'Ein gutes Gespräch hilft im Moment. Was dich weiterbringt, zeigt sich oft erst über mehrere Gespräche: ein Satz, der dir vor drei Wochen klar wurde. Eine Reaktion, die in verschiedenen Situationen wieder auftaucht.',
    'Damit dein Begleiter daran anknüpfen kann, speichert die App deine Gespräche und das, was daraus entsteht:',
  ],
  points: [
    { symbol: '↺', title: 'Weitermachen, wo du aufgehört hast', text: 'Du fängst nicht jedes Mal von vorn an.' },
    { symbol: '✦', title: 'Deine Erkenntnisse bleiben', text: 'Auch die kleinen, die man sonst schnell vergisst.' },
    { symbol: '◎', title: 'Muster werden sichtbar', text: 'Was sich wiederholt, erkennt man erst über die Zeit.' },
    { symbol: '♡', title: 'Der Begleiter lernt dich kennen', text: 'Er merkt sich, welche Art von Fragen dir hilft.' },
  ],
  closing: [
    'Ohne Speichern wäre jedes Gespräch ein erstes Gespräch.',
    'Was gespeichert ist, gehört dir. Du kannst es jederzeit ansehen, herunterladen oder löschen.',
  ],
}

const exportPlace = EXPORT_AVAILABLE ? 'im Datenexport' : 'auf Anfrage bei Jerome'

// Konzept 3.3 – Sheet „Was genau gespeichert wird“
export const WHAT_IS_STORED = [
  { what: 'Deine Gespräche', why: 'Weitermachen, Anknüpfen an frühere Themen', where: 'Gespräch → Alle Gespräche' },
  { what: 'Erkenntnisse', why: 'Spiegel, Nachklang auf Heute, Wiederentdecken', where: 'Spiegel → Erkenntnisse' },
  { what: 'Beobachtete Muster, Stärken, Reaktionen', why: 'der Begleiter erkennt Wiederholungen', where: 'Spiegel → Muster, Entwicklung' },
  { what: 'Notizen des Begleiters zu jedem Gespräch', why: 'Vorbereitung auf das nächste Gespräch', where: exportPlace },
  { what: 'Was dir in Gesprächen hilft (Resonanzkarte)', why: 'passende Fragen und Bilder', where: exportPlace },
  // Konzept: „der Begleiter lernt, was dir hilft“ – gilt erst mit U5b; bis dahin ehrlich ohne Lern-Aussage
  { what: 'Deine Einschätzungen', why: 'deine eigene Einordnung deiner Erkenntnisse', where: 'an jeder Erkenntnis' },
  { what: 'Hinweise auf Krisen', why: 'damit der Begleiter achtsam reagiert', where: exportPlace },
]
