// Fragenkatalog für den strukturierten Beta-Fragebogen (BetaSurveyScreen).
// Frontend-Konstante statt DB-Table, damit Formulierungen ohne Migration
// änderbar bleiben. Stabil ist der `key` — er ist der Anker jeder Auswertung
// in `feedback_survey_scores`. key niemals nachträglich umbenennen, sonst
// brechen historische Vergleiche.
//
// Skala-Semantik einheitlich: 1 = "trifft gar nicht zu" … 5 = "trifft voll zu"
// (bewusst durchgängig Zustimmung, damit Mittelwerte vergleichbar bleiben).

export const SCALE_LABELS = { min: 'trifft gar nicht zu', max: 'trifft voll zu' }

// type: 'scale' (1-5) | 'text' (Freitext, optional) | 'select' (Kontext, Rohwert)
// premiumOnly: true → nur zeigen, wenn plan ∈ {'tester','premium'} (Innere Stimmen)
export const SURVEY_SECTIONS = [
  {
    id: 'kontext',
    title: 'Kurz zu dir',
    intro: 'Zwei, drei Angaben zur Einordnung — nichts davon ist eine Bewertung.',
    items: [
      { key: 'ctx_weeks', type: 'select', label: 'Wie lange nutzt du die App schon?',
        options: ['Unter 1 Woche', '1–2 Wochen', '3–4 Wochen', 'Länger'] },
      { key: 'ctx_frequency', type: 'select', label: 'Wie oft hast du sie genutzt?',
        options: ['Einmal', 'Ein paar Mal', 'Mehrmals pro Woche', '(Fast) täglich'] },
      { key: 'ctx_main_tool', type: 'select', label: 'Welches Werkzeug hast du am meisten genutzt?',
        options: ['KI-Coach', "Wie geht's dir?", 'Mein Spiegel', 'Verstehen', 'Innere Stimmen'] },
    ],
  },
  {
    id: 'onboarding',
    title: 'Erster Eindruck',
    items: [
      { key: 'onb_clarity',     type: 'scale', label: 'Der Einstieg in die App war für mich verständlich.' },
      { key: 'onb_agreement',   type: 'scale', label: 'Coaching-Vereinbarung und Datenschutz-Hinweise waren klar.' },
      { key: 'onb_trust_start', type: 'scale', label: 'Schon zu Beginn hatte ich das Gefühl, dass meine Angaben vertraulich behandelt werden.' },
      { key: 'onb_text', type: 'text', optional: true,
        label: 'Gab es beim Einstieg etwas, das dich verwirrt oder gestört hat?' },
    ],
  },
  {
    id: 'coach',
    title: 'Der Coach',
    intro: 'Das Herzstück der App — hier zählt dein Eindruck am meisten.',
    items: [
      { key: 'coach_understood',    type: 'scale', label: 'Der Coach hat verstanden, worum es mir ging.' },
      { key: 'coach_questions',     type: 'scale', label: 'Die Fragen des Coaches haben mich zum Nachdenken angeregt.' },
      { key: 'coach_perspective',   type: 'scale', label: 'Durch das Gespräch habe ich mein Thema aus einer neuen Perspektive gesehen.' },
      { key: 'coach_authorship',    type: 'scale', label: 'Ich hatte das Gefühl, meine eigenen Antworten zu finden — statt fertige Ratschläge zu bekommen.' },
      { key: 'coach_clarity_after', type: 'scale', label: 'Nach dem Gespräch habe ich mein Anliegen klarer gesehen.' },
      { key: 'coach_tone',          type: 'scale', label: 'Der Ton des Coaches hat sich für mich stimmig und respektvoll angefühlt.' },
      { key: 'coach_challenge_text', type: 'text', optional: true,
        label: 'Gab es einen Moment, in dem dich eine Frage überrascht oder herausgefordert hat? Wenn ja, welchen?' },
      { key: 'coach_best_text', type: 'text', optional: true,
        label: 'Ein Moment, der besonders hilfreich war — oder einer, der für dich nicht funktioniert hat?' },
    ],
  },
  {
    id: 'skala',
    title: "Wie geht's dir?",
    items: [
      { key: 'scale_useful', type: 'scale', label: "Die Skala „Wie geht's dir?“ war ein hilfreicher Einstieg." },
    ],
  },
  {
    id: 'spiegel',
    title: 'Mein Spiegel',
    items: [
      { key: 'mirror_useful', type: 'scale', label: '„Mein Spiegel“ hat mir geholfen, meine Erkenntnisse festzuhalten.' },
      { key: 'mirror_akte',   type: 'scale', label: 'Die „Akte“ (wiederkehrende Themen/Muster) hat mir etwas über mich gezeigt.' },
      { key: 'mirror_text', type: 'text', optional: true, label: 'Was fehlt dir in „Mein Spiegel“?' },
    ],
  },
  {
    id: 'verstehen',
    title: 'Verstehen',
    items: [
      { key: 'verstehen_useful',    type: 'scale', label: 'Die Muster-Bibliothek „Verstehen“ war verständlich und interessant.' },
      { key: 'verstehen_relevance', type: 'scale', label: 'Ich habe dort Muster wiedererkannt, die zu mir passen.' },
    ],
  },
  {
    id: 'stimmen',
    title: 'Innere Stimmen',
    premiumOnly: true,
    items: [
      { key: 'stimmen_useful', type: 'scale', premiumOnly: true, label: 'Die „Inneren Stimmen“ haben mir geholfen, wiederkehrende innere Anteile zu erkennen.' },
      { key: 'stimmen_naming', type: 'scale', premiumOnly: true, label: 'Dass ich einen Anteil selbst benennen konnte, hat sich passend angefühlt.' },
      { key: 'stimmen_text',   type: 'text',  premiumOnly: true, optional: true, label: 'Wie war deine Erfahrung mit den „Inneren Stimmen“?' },
    ],
  },
  {
    id: 'orientierung',
    title: 'Orientierung & Verlauf',
    items: [
      { key: 'history_useful',      type: 'scale', label: 'Frühere Gespräche wiederzufinden und fortzusetzen war einfach.' },
      { key: 'howto_useful',        type: 'scale', label: '„Wie es funktioniert“ hat mir geholfen, mich zurechtzufinden.' },
      { key: 'orientation_overall', type: 'scale', label: 'Ich habe mich insgesamt gut in der App zurechtgefunden.' },
    ],
  },
  {
    id: 'vertrauen',
    title: 'Vertrauen & Sicherheit',
    items: [
      { key: 'trust_share',   type: 'scale', label: 'Ich habe mich sicher gefühlt, persönliche Themen zu teilen.' },
      { key: 'trust_serious', type: 'scale', label: 'Ich hatte das Gefühl, ernst genommen zu werden.' },
      { key: 'trust_care',    type: 'scale', label: 'Ich hatte den Eindruck, dass die App achtsam mit schwierigen Themen umgeht.' },
    ],
  },
  {
    id: 'technik',
    title: 'Technik',
    items: [
      { key: 'tech_speed',  type: 'scale', label: 'Die App hat zügig reagiert (Antworten, Laden).' },
      { key: 'tech_stable', type: 'scale', label: 'Die App lief stabil (keine Abstürze/Fehler).' },
      { key: 'tech_text', type: 'text', optional: true,
        label: 'Sind dir Fehler, Abstürze oder ungewöhnliches Verhalten aufgefallen? Wenn ja, welche?' },
    ],
  },
  {
    id: 'gesamt',
    title: 'Gesamteindruck',
    items: [
      { key: 'overall_satisfaction', type: 'scale', label: 'Insgesamt bin ich mit der App zufrieden.' },
      { key: 'overall_recommend',    type: 'scale', label: 'Ich würde die App weiterempfehlen.' },
      { key: 'overall_continue',     type: 'scale', label: 'Ich könnte mir vorstellen, die App weiter zu nutzen.' },
      { key: 'open_best_text',    type: 'text', label: 'Was hat dir am besten gefallen?' },
      { key: 'open_missing_text', type: 'text', label: 'Was fehlt dir — oder was würdest du ändern?' },
      { key: 'open_anything_text', type: 'text', optional: true, label: 'Möchtest du Jerome sonst noch etwas mitgeben?' },
    ],
  },
]
