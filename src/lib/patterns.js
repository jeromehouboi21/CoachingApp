// src/lib/patterns.js — die fünf allgemeinen Muster („Kennst du das?“) an einer Stelle (U2).
// Texte aus dem früheren Verstehen-Modul (VorstehenScreen + MusterDetail), nur ein Tippfehler korrigiert.
// Die Keys entsprechen pattern_references.pattern_key (post-conversation).

const LIBRARY_LIST = [
  {
    key: 'rueckzug_unter_druck',
    label: 'Rückzug unter Druck',
    icon: '🪞',
    iconBg: 'bg-accent-light',
    desc: 'Wenn es eng wird, ziehst du dich zurück — statt anzusprechen, was dich stört.',
    category: 'Beziehungen',
  },
  {
    key: 'innerer_kritiker',
    label: 'Der innere Kritiker',
    icon: '🔍',
    iconBg: 'bg-surface-2',
    desc: 'Eine Stimme, die keine Fehler erlaubt — und deshalb vieles stoppt, bevor es beginnt.',
    category: 'Selbstbild',
  },
  {
    key: 'uebernahme_reflex',
    label: 'Übernahme-Reflex',
    icon: '⚡',
    iconBg: 'bg-premium-light',
    desc: 'Du übernimmst Verantwortung für andere — auch ohne Einladung dazu.',
    category: 'Arbeit',
  },
  {
    key: 'harmonie_um_jeden_preis',
    label: 'Harmonie um jeden Preis',
    icon: '🕊️',
    iconBg: 'bg-coral-light',
    desc: 'Konflikte zu vermeiden fühlt sich sicherer an — selbst wenn du dabei unsichtbar wirst.',
    category: 'Beziehungen',
  },
  {
    key: 'perfektionismus_blockade',
    label: 'Perfektionismus-Blockade',
    icon: '🎯',
    iconBg: 'bg-surface-2',
    desc: 'Solange etwas nicht perfekt ist, fühlt es sich nicht gut genug an, um es zu zeigen.',
    category: 'Arbeit',
  },
]

const PATTERN_TEXTS = {
  rueckzug_unter_druck: {
    label: 'Rückzug unter Druck',
    icon: '🪞',
    iconBg: 'bg-accent-light',
    subtitle: 'Wenn der Druck steigt, zieht sich etwas in dir zurück',
    steps: [
      {
        title: 'Ein Moment, der sich zu viel anfühlte',
        text: 'Irgendwann war der Rückzug die beste Antwort, die du hattest. Nicht weil du schwach bist — sondern weil du instinktiv geschützt hast, was dir wichtig ist.',
      },
      {
        title: 'Das Muster wiederholt sich',
        text: 'Dein Gehirn erinnert sich: Rückzug hat funktioniert. Deshalb greift es wieder darauf zurück — auch wenn die Situation heute eine andere ist.',
      },
      {
        title: 'Was es heute kosten kann',
        text: 'In manchen Momenten bleibt ungesagt, was gesagt werden könnte. Kontakt entsteht durch Nähe — und die braucht manchmal Reibung.',
      },
    ],
    action: 'Das Muster sehen, bevor es steuert. "Ah. Da ist es wieder." — das ist der erste Schritt.',
    prompt: 'Ich habe gerade etwas über das Muster "Rückzug unter Druck" gelesen. Ich erkenne das bei mir. Kannst du mir helfen zu verstehen, wann das bei mir auftaucht?',
  },
  innerer_kritiker: {
    label: 'Der innere Kritiker',
    icon: '🔍',
    iconBg: 'bg-surface-2',
    subtitle: 'Eine Stimme, die selten zufrieden ist',
    steps: [
      {
        title: 'Ein Moment, der sich zu viel anfühlte',
        text: 'Der innere Kritiker entstand oft als Schutzstrategie — er hat dich vor Fehlern, vor Scham, vor Ablehnung bewahrt. Er meinte es gut.',
      },
      {
        title: 'Das Muster wiederholt sich',
        text: 'Die Stimme hat sich verfestigt. Sie kommentiert, bewertet, zweifelt — oft bevor du überhaupt angefangen hast.',
      },
      {
        title: 'Was es heute kosten kann',
        text: 'Manche Dinge bleiben ungetan. Manche Ideen werden nicht gezeigt. Der Anspruch schützt — aber er kann auch einengen.',
      },
    ],
    action: 'Die Stimme hören, ohne ihr zu gehorchen. "Da ist sie wieder." — das ist genug für den Anfang.',
    prompt: 'Ich habe gerade etwas über den "inneren Kritiker" gelesen und erkenne ihn bei mir. Wann taucht diese Stimme bei mir auf — und was löst sie aus?',
  },
  uebernahme_reflex: {
    label: 'Übernahme-Reflex',
    icon: '⚡',
    iconBg: 'bg-premium-light',
    subtitle: 'Verantwortung übernehmen — auch wenn niemand gefragt hat',
    steps: [
      {
        title: 'Ein Moment, der sich zu viel anfühlte',
        text: 'Irgendwann war es einfacher, selbst zu machen als darauf zu warten, dass andere es tun. Vielleicht war Kontrolle ein Weg, Chaos zu vermeiden.',
      },
      {
        title: 'Das Muster wiederholt sich',
        text: 'Der Reflex greift schnell. Kaum ist eine Lücke da, springst du hinein — manchmal ohne zu merken, dass du es getan hast.',
      },
      {
        title: 'Was es heute kosten kann',
        text: 'Erschöpfung. Das Gefühl, allein zu tragen. Und manchmal der leise Gedanke: Warum tut das sonst niemand?',
      },
    ],
    action: 'Innehalten, bevor du übernimmst. "Wurde ich gebeten?" — eine Frage, die viel verändern kann.',
    prompt: 'Ich habe gerade etwas über den "Übernahme-Reflex" gelesen. Ich glaube, ich erkenne das bei mir. Was steckt dahinter, wenn man ständig Verantwortung übernimmt — auch ungefragt?',
  },
  harmonie_um_jeden_preis: {
    label: 'Harmonie um jeden Preis',
    icon: '🕊️',
    iconBg: 'bg-coral-light',
    subtitle: 'Konflikte vermeiden — auch wenn es dich kostet',
    steps: [
      {
        title: 'Ein Moment, der sich zu viel anfühlte',
        text: 'Konflikte haben sich früh gefährlich angefühlt. Harmonie zu erhalten war klug — sie hat Beziehungen geschützt und Eskalation verhindert.',
      },
      {
        title: 'Das Muster wiederholt sich',
        text: 'Der Drang, es allen recht zu machen, läuft im Hintergrund. Oft unbewusst. Der Körper kennt das Signal: Bloß keinen Konflikt.',
      },
      {
        title: 'Was es heute kosten kann',
        text: 'Manchmal bleibst du dabei unsichtbar. Was du fühlst, was du brauchst — es bleibt ungesagt, um Frieden zu wahren.',
      },
    ],
    action: 'Deine Stimme zählt. "Was würde ich sagen, wenn ich keine Konsequenzen fürchten würde?" — das ist eine gute Frage.',
    prompt: 'Ich habe gerade etwas über "Harmonie um jeden Preis" gelesen. Ich glaube, ich vermeide Konflikte öfter als mir bewusst ist. Was passiert in mir, wenn ein Konflikt droht?',
  },
  perfektionismus_blockade: {
    label: 'Perfektionismus-Blockade',
    icon: '🎯',
    iconBg: 'bg-surface-2',
    subtitle: 'Wenn "gut genug" sich nicht gut genug anfühlt',
    steps: [
      {
        title: 'Ein Moment, der sich zu viel anfühlte',
        text: 'Perfektion war oft ein Schutz vor Kritik, vor Scham, vor dem Gefühl, nicht zu genügen. Hohe Ansprüche haben gute Ergebnisse gesichert.',
      },
      {
        title: 'Das Muster wiederholt sich',
        text: 'Der innere Maßstab liegt hoch. Manchmal so hoch, dass der Start schwerfällt — oder das Fertige nicht gezeigt wird.',
      },
      {
        title: 'Was es heute kosten kann',
        text: 'Dinge bleiben halb fertig. Ideen werden nicht geteilt. Die Energie fließt in Verbesserung statt in Fertigstellung.',
      },
    ],
    action: 'Fertig ist besser als perfekt. "Was wäre der kleinste Schritt, den ich jetzt tun könnte?" — oft reicht das.',
    prompt: 'Ich habe gerade etwas über die "Perfektionismus-Blockade" gelesen. Ich glaube, das hält mich manchmal auf. Kannst du mir helfen zu verstehen, was dahintersteckt?',
  },
}

/** Alle fünf Muster in fester Reihenfolge, Listen- und Detailtexte zusammengeführt. */
export const PATTERNS = LIBRARY_LIST.map((p) => ({ ...p, ...PATTERN_TEXTS[p.key] }))

export const PATTERN_KEYS = PATTERNS.map((p) => p.key)

export function getPattern(key) {
  return PATTERNS.find((p) => p.key === key) ?? null
}
