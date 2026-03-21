export const DAILY_IMPULSE_QUESTIONS = [
  "Welcher Teil von dir wird heute am wenigsten gehört?",
  "Wann hast du zuletzt etwas getan, das sich wirklich nach dir angefühlt hat?",
  "Was würdest du dir selbst sagen, wenn du dein bester Freund wärst?",
  "Gibt es jemanden, dem du innerlich noch nicht verziehen hast — auch dir selbst?",
  "Was trägst du gerade mit dir, das eigentlich nicht dir gehört?",
  "In welcher Situation verhältst du dich anders als du möchtest?",
  "Was wäre möglich, wenn du weniger Angst hättest?",
  "Welches Muster erkennst du — in der Arbeit, in Beziehungen?",
  "Was schützt du, wenn du dich zurückziehst?",
  "Wer oder was gibt dir gerade Kraft — auch wenn es klein erscheint?",
  "Wenn du nur auf das schaust, was du selbst beeinflussen kannst — was wäre das?",
  "Was wäre, wenn die Situation bleibt wie sie ist — was könnte sich trotzdem in dir verändern?",
  "Was kostet es dich, die Dinge so zu sehen, wie du sie siehst?",
  "Wann hast du das letzte Mal gespürt, dass etwas wirklich in deiner Hand lag?",
]

export const OPENING_MESSAGES = [
  "Schön, dass du heute hier bist. Was ist das eine Thema, das dich gerade wirklich beschäftigt? Es braucht kein großes Problem sein.",
  "Willkommen zurück. Wie ist es dir seit unserem letzten Gespräch ergangen? Was hat sich verändert — auch wenn es klein erscheint?",
  "Ein neues Gespräch. Was bringst du heute mit? Was ist gerade leise da und wartet darauf, gehört zu werden?",
]

// Erstes Gespräch überhaupt — keine Rückkehrreferenz, keine Erwartung
export const FIRST_OPENING_MESSAGE = "Schön, dass du da bist. Was beschäftigt dich gerade — gibt es etwas, das du schon länger mit dir trägst?"

export const SCALING_HINTS = {
  1:  "Was hält dich gerade noch aufrecht — auch wenn es wenig ist?",
  2:  "Was wäre der kleinste denkbare Schritt, der sich heute noch möglich anfühlt?",
  3:  "Wann war das zuletzt anders? Was war in diesem Moment anders als jetzt?",
  4:  "Was wäre anders für dich, wenn du dich bei einer 6 fühlen würdest?",
  5:  "Du bist genau in der Mitte. Was zieht dich gerade nach oben — und was nach unten?",
  6:  "Was hat dich schon von einer 5 auf eine 6 gebracht — auch wenn es klein war?",
  7:  "Was bräuchtest du, um dich bei einer 8 zu fühlen?",
  8:  "Was macht diesen Moment gerade besser als sonst?",
  9:  "Was würde eine 10 von dieser 9 unterscheiden?",
  10: "Wie hast du das erreicht? Was kannst du daraus für andere Bereiche mitnehmen?",
}

export const getDailyImpulse = () => {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
  return DAILY_IMPULSE_QUESTIONS[dayOfYear % DAILY_IMPULSE_QUESTIONS.length]
}

export const WELLNESS_SCORES = {
  1:  { label: 'Sehr schlecht', emoji: '😔', color: '#C4593A' },
  2:  { label: 'Schlecht',      emoji: '😟', color: '#C4593A' },
  3:  { label: 'Nicht gut',     emoji: '😕', color: '#C4845A' },
  4:  { label: 'So lala',       emoji: '🙁', color: '#C4A85A' },
  5:  { label: 'Okay',          emoji: '😐', color: '#8B9E5A' },
  6:  { label: 'Ganz gut',      emoji: '🙂', color: '#5A9E6A' },
  7:  { label: 'Gut',           emoji: '😊', color: '#4A8C7A' },
  8:  { label: 'Sehr gut',      emoji: '😄', color: '#2D5A4E' },
  9:  { label: 'Großartig',     emoji: '🤩', color: '#2D5A4E' },
  10: { label: 'Fantastisch',   emoji: '🌟', color: '#2D5A4E' },
}

export const WELLNESS_CONTEXT_CHIPS = {
  low:    ['Stress bei der Arbeit', 'Streit mit jemandem', 'Bin erschöpft', 'Fühle mich überfordert'],
  medium: ['Gewöhnlicher Tag', 'Ein bisschen Stress', 'Müde aber okay', 'Gemischte Gefühle'],
  high:   ['Schöner Moment', 'Etwas ist gut gelaufen', 'Fühle mich klar', 'Dankbar heute'],
}

export function getWellnessRange(score) {
  if (score <= 3) return 'low'
  if (score <= 6) return 'medium'
  return 'high'
}
