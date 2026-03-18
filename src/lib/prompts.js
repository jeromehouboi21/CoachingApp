export const DAILY_IMPULSE_QUESTIONS = [
  "Welcher Teil von dir wird heute am wenigsten gehört?",
  "Wann hast du zuletzt etwas getan, das sich wirklich nach dir angefühlt hat?",
  "Was würdest du dir selbst sagen, wenn du dein bester Freund wärst?",
  "Gibt es jemanden, dem du innerlich noch nicht verziehen hast — auch dir selbst?",
  "Was trägst du gerade mit dir, das eigentlich nicht dir gehört?",
  "In welcher Situation verhältst du dich anders als du möchtest?",
  "Was wäre möglich, wenn du weniger Angst hättest?",
  "Welches Muster erkennst du immer wieder — in der Arbeit, in Beziehungen?",
  "Was schützt du, wenn du dich zurückziehst?",
  "Wer oder was gibt dir gerade Kraft — auch wenn es klein erscheint?",
  "Wenn du nur auf das schaust, was du selbst beeinflussen kannst — was wäre das?",
  "Was wäre, wenn die Situation bleibt wie sie ist — was könnte sich trotzdem in dir verändern?",
  "Was kostet es dich, die Dinge so zu sehen, wie du sie siehst?",
  "Wann hast du das letzte Mal gespürt, dass etwas wirklich in deiner Hand lag?",
]

export const OPENING_MESSAGES = [
  "Schön, dass du heute hier bist. Was ist das eine Thema, das dich gerade wirklich beschäftigt? Es muss kein großes Problem sein.",
  "Willkommen zurück. Wie ist es dir seit unserem letzten Gespräch ergangen? Was hat sich verändert — auch wenn es klein erscheint?",
  "Ein neues Gespräch. Was bringt dich heute hierher? Was ist gerade leise da und wartet darauf, gehört zu werden?",
]

export const SCALING_HINTS = {
  1:  "Was hält dich davon ab, dieses Thema loszulassen?",
  2:  "Was wäre der kleinste denkbare Schritt nach vorne?",
  3:  "Wann war das zuletzt anders? Was war da anders?",
  4:  "Was wäre anders, wenn du bei einer 6 wärst?",
  5:  "Du bist genau in der Mitte. Was zieht dich nach oben — was nach unten?",
  6:  "Was hat dich schon von 5 auf 6 gebracht?",
  7:  "Was brauchst du, um bei einer 8 zu sein?",
  8:  "Was macht diese Situation gerade besser?",
  9:  "Was würde eine 10 von einer 9 unterscheiden?",
  10: "Wie hast du das erreicht? Was kannst du daraus für andere Bereiche mitnehmen?",
}

export const getDailyImpulse = () => {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
  return DAILY_IMPULSE_QUESTIONS[dayOfYear % DAILY_IMPULSE_QUESTIONS.length]
}
