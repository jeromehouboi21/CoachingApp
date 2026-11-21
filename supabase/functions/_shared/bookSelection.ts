// supabase/functions/_shared/bookSelection.ts — B1 Buch-Bezüge: alle Regeln als reine Funktionen.
// Ohne Imports und ohne TS-Konstrukte, die Code erzeugen: läuft in Deno und mit `node --test`
// (Node v24 entfernt nur die Typangaben). Test: bookSelection.test.ts.
// Buchtexte kommen ausschließlich aus public.book_passages (Seed 046); hier stehen nur Regeln
// und die freigegebenen Prompt-Texte (Handoff 5.1/5.2, J-B1 21.11.2026).

export const BOOK_MIN_HISTORY = 4;           // Nachrichten im Verlauf vor dem ersten Prüfen
export const BOOK_CHECK_REPLIES = [3, 6, 8]; // Coach-Antwort Nr., vor der geprüft wird (A4: 8 statt 9,
                                             // weil das Mechanismus-Angebot immer auf Antwort 5, 9, 13 fällt)
export const BOOK_WINDOW_REPLIES = 3;        // so viele Antworten bleibt der Block offen
export const BOOK_MAX_CANDIDATES = 2;
export const BOOK_SELECT_TIMEOUT_MS = 2500;
export const BOOK_SELECT_MAX_TOKENS = 60;
export const BOOK_SELECT_MESSAGES = 6;       // letzte Nachrichten für den Auswahlschritt
export const BOOK_SELECT_MESSAGE_CHARS = 600;

export type BookStatus = 'read' | 'reading' | 'not_yet' | null;
export type Passage = {
  id: string; kind: 'dialog' | 'erklaerung' | 'jerome'; position: number;
  part_title: string; title: string; situation_summary: string; key_quote: string;
  bridge_question: string | null; fits_when: string | null; book_questions: string[];
  themes: string[]; coach_note: string | null;
  is_resolution: boolean; is_sensitive: boolean; sensitive_rule: string | null;
  is_active: boolean; approved_by_jerome_at: string | null;
};
export type BookStep = 'window' | 'window_skip' | 'check' | 'check_skip' | 'none';
export type SelectionResult =
  | { ok: true; ids: string[] }
  | { ok: false; reason: 'parse' | 'invalid_ids' };

/** Erlaubt der Schalter BOOK_REFERENCES_MODE diesen Nutzer? */
export function modeAllows(mode: string | undefined, isAdmin: boolean): boolean {
  const m = (mode ?? '').trim();
  if (m === 'all') return true;
  if (m === 'admin') return isAdmin === true;
  return false;
}

/** Darf der Buch-Pfad in diesem Turn überhaupt laufen? (Sicherheitsregel 4) */
export function bookPathOpen(i: {
  modeAllowed: boolean; status: BookStatus; bookBlocked: boolean;
  crisisNow: boolean; ownThreadHigh: boolean; lastThreadHigh: boolean;
}): boolean {
  if (!i.modeAllowed) return false;
  if (i.status !== 'read' && i.status !== 'reading') return false;
  if (i.bookBlocked || i.crisisNow || i.ownThreadHigh || i.lastThreadHigh) return false;
  return true;
}

/** Welche Stellen darf dieser Leser bekommen? (E5) */
export function eligiblePassages(all: Passage[], status: BookStatus, progress: number | null): Passage[] {
  const approved = all.filter((p) => p.is_active && !!p.approved_by_jerome_at);
  if (status === 'read') return approved;
  if (status === 'reading' && Number.isInteger(progress) && (progress as number) >= 1) {
    const n = progress as number;
    return approved.filter((p) => p.position <= n && (!p.is_resolution || p.position < n));
  }
  return [];
}

/** Was passiert in dieser Antwort? (E4) */
export function bookStep(i: {
  replyNo: number; historyLength: number; offeredReply: number | null; collision: boolean;
}): BookStep {
  if (i.offeredReply !== null && i.offeredReply !== undefined) {
    if (i.replyNo >= i.offeredReply && i.replyNo < i.offeredReply + BOOK_WINDOW_REPLIES) {
      return i.collision ? 'window_skip' : 'window';
    }
    return 'none';
  }
  if (i.historyLength >= BOOK_MIN_HISTORY && BOOK_CHECK_REPLIES.includes(i.replyNo)) {
    return i.collision ? 'check_skip' : 'check';
  }
  return 'none';
}

function firstSentence(s: string): string {
  const t = (s ?? '').trim();
  const m = t.match(/^(.+?[.!?])(\s|$)/);
  return m ? m[1] : t;
}

/** Liste für den Auswahlschritt: eine Zeile pro Stelle, keine Kernsätze. */
export function buildSelectionIndex(passages: Passage[]): string {
  return passages.map((p) => {
    const when = p.fits_when ? `passt, wenn: ${p.fits_when}` : firstSentence(p.situation_summary);
    let line = `${p.id} | ${p.title} | ${when}`;
    if (p.is_sensitive) {
      const topic = p.themes.length > 0 ? p.themes.join(', ') : p.title;
      line += ` [SENSIBEL – nur wenn der Mensch das Thema selbst anspricht: ${topic}]`;
    }
    return line;
  }).join('\n');
}

/** Antwort des Auswahlschritts prüfen. Unbekannte Kennung → invalid_ids. */
export function parseSelection(raw: string, allowedIds: Set<string>): SelectionResult {
  const text = (raw ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'parse' };   // Fehlermeldung enthält Textausschnitte → verworfen
  }
  const ids = (parsed as { ids?: unknown } | null)?.ids;
  if (!Array.isArray(ids) || !ids.every((x) => typeof x === 'string')) return { ok: false, reason: 'parse' };
  const unique = [...new Set(ids as string[])];
  if (unique.some((id) => !allowedIds.has(id))) return { ok: false, reason: 'invalid_ids' };
  return { ok: true, ids: unique.slice(0, BOOK_MAX_CANDIDATES) };
}

/** Kurztext für die letzten Nachrichten im Auswahlschritt. */
export function buildSelectionTranscript(msgs: { role: string; content: string }[]): string {
  return msgs.slice(-BOOK_SELECT_MESSAGES).map((m) => {
    const who = m.role === 'user' ? 'Mensch' : 'Coach';
    const c = (m.content ?? '').replace(/\s+/g, ' ').trim().slice(0, BOOK_SELECT_MESSAGE_CHARS);
    return `${who}: ${c}`;
  }).join('\n');
}

// ── Freigegebene Texte (Handoff 5.1–5.3, J-B1 21.11.2026) ───────────────────

export const BOOK_SELECT_SYSTEM = `Du ordnest einen Gesprächsausschnitt Stellen aus einem Buch zu. Du sprichst nicht mit dem Menschen.

Unter STELLEN steht für jede Stelle eine Kennung, ein Titel und wann sie passt.
Unter LETZTE NACHRICHTEN steht der Ausschnitt aus einem Coaching-Gespräch.

Wähle höchstens zwei Stellen, die sehr deutlich zu dem passen, was der Mensch gerade selbst erzählt.
Ein gemeinsames Stichwort reicht nicht. Im Zweifel wählst du keine.
Stellen mit [SENSIBEL …] wählst du nur, wenn der Mensch das genannte Thema in diesen Nachrichten selbst angesprochen hat.
Wirkt der Mensch akut belastet, verzweifelt oder in Not, wählst du keine Stelle.

Antworte nur mit JSON, ohne weiteren Text:
{"ids": ["T3-D1"]}  oder  {"ids": []}`;

/** Nutzerinhalt des Auswahlschritts. */
export function buildSelectionUserContent(index: string, transcript: string): string {
  return `STELLEN:\n${index}\n\nLETZTE NACHRICHTEN:\n${transcript}`;
}

export const BOOK_BASE_LINE = 'Jeromes Buch „Friedensstifter“ kennst du nur aus Stellen, die dir im Block BUCH-STELLEN mitgegeben werden. Ohne diesen Block erwähnst du das Buch nicht von dir aus. Fragt der Mensch selbst danach, erzählst du nichts über den Inhalt und sagst ihm, dass er im Profil unter „Das Buch zur App“ mehr dazu findet.';

const KIND_LABEL: Record<string, string> = {
  dialog: 'Gespräch zwischen Tim und Mara',
  erklaerung: 'Erklärung „Was dahintersteckt“',
  jerome: 'Jeromes eigene Geschichte',
};

function partLabel(p: Passage): string {
  if (p.part_title === 'Vorweg') return 'Vorweg';
  if (p.part_title === 'Davor und danach') return 'Davor und danach (zwischen Teil 6 und 7)';
  if (p.part_title === 'Epilog') return 'Epilog';
  return `Teil ${p.position} – ${p.part_title}`;
}

function passageLines(p: Passage, n: number): string {
  const lines = [
    `[${n}] ${partLabel(p)} · ${p.title}`,
    `    Art: ${KIND_LABEL[p.kind] ?? p.kind}`,
    `    Situation: ${p.situation_summary}`,
    `    Kernsatz (wörtlich, darf zitiert werden): „${p.key_quote}“`,
  ];
  if (p.bridge_question) lines.push(`    Einladungsfrage: ${p.bridge_question}`);
  if (p.book_questions.length > 0) lines.push(`    Fragen aus dem Buch: ${p.book_questions.map((q) => `„${q}“`).join(' · ')}`);
  if (p.coach_note) lines.push(`    Hinweis: ${p.coach_note}`);
  if (p.is_resolution) lines.push('    🔒: Diese Stelle löst einen früheren Erzählstrang auf. Erzähle nicht nach, wie es ausgeht.');
  if (p.is_sensitive) lines.push(`    ⚠: SONDERREGEL: ${p.sensitive_rule ?? ''} Nur die Kernaussage, keine Details. Keine Parallele zu Diagnosen oder Erkrankungen ziehen.`);
  return lines.join('\n');
}

/** Block BUCH-STELLEN (BLOCK 8 im Coach-Prompt). */
export function buildBookBlock(i: {
  passages: Passage[]; status: 'read' | 'reading'; progress: number | null; windowReply: 1 | 2 | 3;
}): string {
  const who = i.status === 'read'
    ? 'Er hat es durchgelesen.'
    : `Er liest gerade Teil ${i.progress}. Erwähne nichts, was im Buch erst später passiert.`;
  const parts = [
    '--- BUCH-STELLEN (nur diese verwenden) ---',
    `Der Mensch kennt Jeromes Buch „Friedensstifter“. ${who}`,
    'Zu diesem Gespräch könnte diese Stelle passen:',
    '',
    i.passages.slice(0, BOOK_MAX_CANDIDATES).map((p, idx) => passageLines(p, idx + 1)).join('\n\n'),
    '',
    'So gehst du damit um:',
    '1. Höchstens EINE Stelle in diesem Gespräch, und nur wenn sie wirklich passt. Lieber keine als eine bemühte.',
    '2. Erst fragen, dann erzählen. Lade zuerst ein, etwa mit der Einladungsfrage oder mit „Erinnert dich das an ein Gespräch zwischen Tim und Mara?“. Erst wenn der Mensch nichts damit verbindet, beschreibe die Szene in ein bis zwei Sätzen.',
    '3. Danach geht es wieder um den Menschen, zum Beispiel: „Was ist bei dir ähnlich, was ist anders als bei Tim?“',
    '4. Verweise nur auf diese Stellen. Erfinde keine Szenen, Dialoge, Zitate oder Erlebnisse und ergänze nichts aus dem Gedächtnis.',
    '5. Höchstens ein bis zwei Sätze wörtlich, alles andere in eigenen Worten.',
    '6. Von Jerome erzählst du nur, was hier steht, in der Form „Jerome erzählt im Buch, wie …“. Nie als deine eigene Erinnerung.',
    '7. Kein Ende verraten, keine Kapitel zusammenfassen. Fragt der Mensch danach, antworte freundlich: „Das liest du am besten selbst. Hier geht es um dich.“',
    '8. Wörtliche Buchzitate dürfen „muss“ enthalten. Deine eigenen Sätze drumherum bleiben ohne „müssen“.',
    '9. Maras Redewendungen übernimmst du nicht als deine eigenen. Du bist nicht Mara.',
    '10. Wirkt der Mensch belastet oder ist er bei einem anderen Thema, lass das Buch weg.',
  ];
  if (i.windowReply >= 2) {
    parts.push('Diese Stellen hast du schon in einer vorigen Antwort bekommen. Hast du schon eingeladen, knüpf daran an und fang nicht neu an. Hat der Mensch nicht darauf reagiert, lass es.');
  }
  parts.push('--- ENDE BUCH-STELLEN ---');
  return parts.join('\n');
}
