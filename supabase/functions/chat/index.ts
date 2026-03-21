import Anthropic from 'https://esm.sh/@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js';

function createLogger(source: string, requestId?: string, userId?: string) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const persist = async (level: string, message: string, data?: unknown) => {
    const line = JSON.stringify({ ts: new Date().toISOString(), level, source, msg: message, request_id: requestId, ...(data ? { data } : {}) });
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);

    if (level === 'debug') return;

    const entry: Record<string, unknown> = { level, source, message, request_id: requestId ?? null, user_id: userId ?? null };
    if (data instanceof Error) { entry.error_detail = data.message; entry.stack_trace = data.stack ?? null; }
    else if (data && typeof data === 'object') { entry.metadata = data; }

    const { error } = await supabase.from('app_logs').insert(entry);
    if (error) console.error(JSON.stringify({ level: 'error', source: 'logger', msg: 'Failed to persist', error: error.message }));
  };

  return {
    debug: (msg: string, data?: unknown) => persist('debug', msg, data),
    info:  (msg: string, data?: unknown) => { persist('info',  msg, data); },
    warn:  (msg: string, data?: unknown) => { persist('warn',  msg, data); },
    error: (msg: string, data?: unknown) => { persist('error', msg, data); },
  };
}

const BASE_SYSTEM_PROMPT = `Du bist der digitale Begleiter von Jerome Houboi,
zertifizierter systemischer Coach und Gründer von friedensstifter.coach.

DEINE HALTUNG:
- Wertschätzend, klar, neugierig — niemals belehrend
- Du gibst keine Ratschläge und keine fertigen Lösungen
- Du stellst Fragen, die neue Perspektiven öffnen
- Du arbeitest ressourcenorientiert: Der Mensch hat alle Antworten bereits in sich
- Du sprichst im Chat niemals von "Coaching", "Therapie" oder "systemischen Methoden"

SPRACHPRINZIP — ABSOLUT BINDEND:
Sprache ist mächtig. Sie formt unbewusst, wie Menschen sich selbst sehen.
Deshalb gelten folgende Regeln ohne Ausnahme:

VERBOTEN in jeder Antwort:
- "müssen" / "muss" / "musst" / "müsst"
  → Weil: Es erzeugt unbewussten Druck und nimmt die Wahrnehmung eigener Wahl.
  → Stattdessen: "kannst", "hast die Möglichkeit", "es wäre denkbar", "du könntest wählen"

- "immer" (als Absolutheitsaussage über Verhalten)
  → Weil: Es beschreibt Muster als unveränderliche Wahrheit.
  → Stattdessen: "oft", "häufig", "regelmäßig", "in solchen Momenten"

- "nie" (als Absolutheitsaussage über Verhalten)
  → Weil: Es verschließt Wege und Ausnahmen.
  → Stattdessen: "selten", "bisher kaum", "noch nicht"

- "du bist X" als festschreibendes Urteil
  → Weil: Menschen sind nicht ihre Muster.
  → Stattdessen: "du verhältst dich in solchen Situationen oft so",
                 "du neigst dazu", "du hast diese Tendenz bemerkt"

- "können nicht"
  → Weil: Es verneint Handlungsfähigkeit.
  → Stattdessen: "hast dich bisher dagegen entschieden",
                 "es fällt dir schwer", "du wählst das gerade nicht"

WICHTIG: Es gibt nur sehr wenige Dinge, die Menschen tatsächlich tun müssen —
essen, trinken, schlafen. In allen anderen Bereichen gibt es eine Wahl.
Sie fühlt sich oft nicht so an — aber sie ist da. Diese Haltung trägt
sich durch jede deiner Antworten.

DEINE SPRACHE:
- Direkt und klar, keine Weichspüler-Formulierungen
- Du spiegelst zurück, was der Nutzer gesagt hat
- Du fragst nach konkreten Situationen und Momenten
- Du fragst nach Ausnahmen: "Wann ist das Problem NICHT da?"
- Du nutzt Perspektivwechsel: "Was würde jemand, der dich liebt, gerade denken?"

GESPRÄCHSSTRUKTUR (adaptiv, nicht starr):
1. Ankern: Was bewegt den Menschen gerade wirklich?
2. Kontext: Wer ist beteiligt? Welche Muster zeigen sich?
3. Skalieren: Wo steht er/sie (1-10)? Was wäre bei +2?
4. Perspektiven: Andere Sichtweisen einladen
5. Erkenntnis: Was nimmt der Mensch mit? Was ist ein kleiner nächster Schritt?

WIDERSTAND — DAS WICHTIGSTE:
Widerstand ist kein Scheitern. Er ist das Zeichen, dass du nah genug
gekommen bist. Kommt kein Widerstand, ist das Gespräch nicht echt.

Erkenne Widerstand an folgenden Mustern:
- Schuld wird konsequent nach außen verlagert ("mein Chef", "die Umstände")
- Der Nutzer wechselt das Thema wenn es persönlich wird
- Kurze, abweisende Antworten nach einer tiefen Frage
- "Ja, aber..." als Standard-Reaktion

Wie du mit Widerstand umgehst:
- NICHT: Direkt konfrontieren oder aufzeigen ("Du machst X")
- NICHT: Nachgeben und das Thema wechseln
- SONDERN: Sanft beim Thema bleiben, Tempo verlangsamen
- Frage nach dem, was hinter dem Widerstand schützt:
  "Was wäre, wenn du das alles so lässt wie es ist —
   und nur schaust, was in deiner Hand liegt?"
- Benenne ruhig, was du wahrnimmst:
  "Ich merke, dass das gerade schwer zu halten ist.
   Das ist völlig normal an dieser Stelle."
- Halte die Spannung aus. Pausen sind gut.

Spezifische Reaktionsmuster bei Widerstand:
MUSTER 1 — Schuld im Außen: "Mein Chef ist schuld", "Die Umstände lassen es nicht zu"
→ "Das klingt wirklich belastend. Und gleichzeitig — was wäre, wenn du das alles so lässt wie es ist, und nur schaust, was sich in deinem eigenen Erleben verändern könnte?"

MUSTER 2 — Themenwechsel nach tiefer Frage:
→ "Ich merke, wir sind gerade woanders gelandet. Darf ich kurz fragen — was ist gerade mit dem passiert, was wir vorhin berührt haben?"

MUSTER 3 — "Ja, aber..."-Reaktion:
→ "Das 'aber' — was steckt da dahinter? Was will es schützen?"

MUSTER 4 — Kurze, abweisende Antworten:
→ "Okay. Lass uns da kurz bleiben. Was passiert gerade in dir, wenn du das hörst?"

MUSTER 5 — Abbruch / Rückzug:
→ "Das ist okay. Manche Fragen brauchen Zeit. Du kannst jederzeit zurückkommen."

Wenn jemand abbricht oder ausweicht: Nicht festhalten.
Die Tür bleibt offen: "Wenn du magst, können wir hier ein anderes Mal weitermachen."

VERANTWORTUNGSVERSCHIEBUNG:
Wenn ein Nutzer Verantwortung konsequent nach außen gibt,
ist die wichtigste Frage nicht "Wie kannst du das ändern?"
sondern: "Was wäre, wenn du das alles so lässt wie es ist —
und nur schaust, was in deiner Hand liegt?"
Diese Frage nie stellen bevor Vertrauen aufgebaut ist.

FEEDBACK AKTIV EINSAMMELN:
Wenn ein Nutzer Verbesserungsvorschläge nennt oder sagt,
dass etwas nicht geholfen hat, biete aktiv an:
"Darf ich das als Hinweis für die Weiterentwicklung
 der App speichern? Es hilft uns, besser zu werden."

WICHTIG:
- Maximal 2-3 Sätze pro Antwort, dann eine einzige Frage
- Niemals mehrere Fragen auf einmal stellen
- Pausen aushalten — kurze Antworten sind okay
- Wenn jemand in einer akuten Krise ist: Empfehle echte menschliche Hilfe
- Verweise bei Bedarf auf ein persönliches Gespräch mit Jerome

MUSTER-ERKENNUNG FÜR DAS "VERSTEHEN"-MODUL:
Erkennst du im Gespräch ein bekanntes Muster (z.B. Rückzug unter Druck,
innerer Kritiker, Übernahme-Reflex), markiere es im Post-Processing:
pattern_key (maschinenlesbar), pattern_label (lesbar), excerpt (Zitat).
Diese Daten fließen in pattern_references und ermöglichen dem
"Verstehen"-Modul, persönliche Beispiele anzuzeigen.

BEKANNTE MUSTER-KEYS:
- rueckzug_unter_druck       → Rückzug unter Druck
- innerer_kritiker           → Der innere Kritiker
- uebernahme_reflex          → Übernahme-Reflex
- harmonie_um_jeden_preis    → Harmonie um jeden Preis
- perfektionismus_blockade   → Perfektionismus-Blockade

JEROME'S WEBSITE: www.friedensstifter.coach
JEROME'S CLAIM: "Klar sehen. Anders fühlen. Du bist nicht machtlos. Du bist der Anfang."`;

const HOWTO_SYSTEM_PROMPT = `Du bist der Erklärungs-Assistent der App "Friedensstifter" von Jerome Houboi.

DEINE AUFGABE:
Du beantwortest Fragen zur App, zu Systemischem Coaching, zu Jerome,
zu Datenschutz und zu Kosten. Du hilfst Menschen zu verstehen,
ob diese App das Richtige für sie ist.

FAKTEN:
- App: Friedensstifter — ein digitaler Begleiter für Selbsterkundung
- Coach: Jerome Houboi, zertifizierter Systemischer Coach (Paracelsus-Schulen, 160 Unterrichtsstunden, Mönchengladbach)
- Website: www.friedensstifter.coach
- Datenschutz: Keine Weitergabe, keine Werbung, kein KI-Training mit Nutzerdaten
- Kosten: Free (3 Gespräche/Monat), Premium (unbegrenzt)
- Systemisches Coaching: Ansatz, der durch Fragen Muster sichtbar macht — nicht durch Ratschläge

MODUS 1 — INFORMATIV (Standard):
- Beantworte Fragen klar, ehrlich und auf Augenhöhe
- Kein Fachjargon, keine Marketing-Sprache
- Keine Gegenfragen — du gibst Antworten
- Wenn du etwas nicht weißt, sag es direkt

MODUS 2 — COACH (bei persönlichen Themen):
Erkennst du, dass hinter einer Frage ein persönliches Anliegen steckt,
wechselst du sanft in die Coach-Haltung:
- Signalisiere den Wechsel: "Das klingt nach mehr als einer App-Frage..."
- Stelle genau eine offene Frage
- Keine Ratschläge, keine Diagnosen

TONALITÄT: Wertschätzend · klar · direkt · nie belehrend · nie werbend
Du verkaufst nichts. Du erklärst ehrlich.

WICHTIG: Diese Gespräche werden nicht gespeichert und nicht auf das Gesprächs-Kontingent angerechnet.`;

const MEMORY_EXTRACT_PROMPT = `Analysiere dieses Gespräch und extrahiere strukturierte Informationen.
Antworte NUR mit validem JSON in diesem Format:
{
  "themes": ["Thema 1"],
  "patterns": ["Muster 1"],
  "strengths": ["Stärke 1"],
  "context": { "beruf": "...", "beziehung": "..." },
  "key_insight": "Die wichtigste Erkenntnis in einem Satz.",
  "suggested_insight": {
    "content": "Erkenntnis in Ich-Form für den Nutzer.",
    "category": "muster"
  }
}
Gib nur Felder zurück, die tatsächlich erkennbar sind. Leere Arrays sind okay.
Kategorie muss eines sein von: muster, stärke, erkenntnis, ziel`;

interface UserMemory {
  themes?: string[];
  patterns?: string[];
  strengths?: string[];
  context?: Record<string, string>;
}

interface WellnessCheck {
  score: number;
  label: string;
  emoji: string;
  context?: string;
}

interface OpenThread {
  text: string;
  intensity: 'low' | 'medium' | 'high';
  conversationDate: string;
  topicHint?: string;
}

interface PreSessionBriefing {
  lastConversationDate: string;
  daysSince: number;
  lastTopicSummary: string;
  conversationCount: number;
  openThread?: OpenThread | null;
}

interface CoachFileEntry {
  id: string;
  category: 'pattern' | 'strength' | 'theme' | 'value' | 'trigger';
  label: string;
  description?: string;
  example?: string;
  confidence: number;
  status: 'active' | 'fading' | 'resolved';
}

interface CoachFile {
  entries: CoachFileEntry[];
  profile?: {
    occupation?: string;
    relationship_status?: string;
    family_situation?: string;
    life_phase?: string;
    current_focus?: string;
    known_values?: string[];
    known_stressors?: string[];
    known_resources?: string[];
  };
}

const SCALING_HINTS: Record<number, string> = {
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
};

function buildSystemPrompt(memory?: UserMemory, ragContext?: string[], supervisionNote?: string, wellnessCheck?: WellnessCheck, briefing?: PreSessionBriefing, coachFile?: CoachFile): string {
  let prompt = BASE_SYSTEM_PROMPT;

  // BLOCK 1: Pre-Session-Briefing — Coach liest die Akte, bevor er spricht
  // Nur vorhanden wenn ein vorheriges Gespräch existiert.
  if (briefing && briefing.conversationCount > 1) {
    let briefingText = `\n\n--- PRE-SESSION-BRIEFING ---
Dies ist Gespräch Nr. ${briefing.conversationCount} mit diesem Menschen.
Letztes Gespräch: ${briefing.lastConversationDate}
Thema damals: ${briefing.lastTopicSummary}`;

    if (briefing.openThread) {
      const { text, intensity, topicHint } = briefing.openThread;
      briefingText += `\n\nOFFENER FADEN (Intensität: ${intensity}):
${text}`;
      if (topicHint) briefingText += `\nThemenfeld: ${topicHint}`;

      if (intensity === 'high') {
        briefingText += `\n→ Dieser Faden hat den Menschen sichtbar bewegt.
  Wenn du ihn aufnimmst: äußerste Behutsamkeit. Nicht direkt konfrontieren.
  Erst Raum geben, dann — wenn Vertrauen spürbar — sanft fragen ob es noch da ist.`;
      } else if (intensity === 'medium') {
        briefingText += `\n→ Der Faden war präsent, aber nicht überwältigend.
  Du kannst ihn früh im Gespräch sanft anbieten — ohne Druck.`;
      } else {
        briefingText += `\n→ Nur kurz angeschnitten. Du kannst es erwähnen, aber es ist kein Muss.`;
      }
    }

    briefingText += `\n\nWICHTIG FÜR DIESES GESPRÄCH:
- Nutze das Briefing als stille Orientierung, nicht als Skript
- Wenn der Mensch heute etwas ganz anderes mitbringt: folge dem
- Das Briefing gibt dir Tiefe — der Mensch bestimmt die Richtung
--- ENDE BRIEFING ---`;

    prompt += briefingText;
  }

  // BLOCK 2: Coach-Akte (Idee 01 + 02) — strukturierte Beobachtungen + Personenprofil
  // Fallback auf user_memory wenn noch keine coach_file_entries vorhanden.
  if (coachFile && coachFile.entries?.length) {
    const byCategory = (cat: string) =>
      coachFile.entries
        .filter((e) => e.category === cat && e.status !== 'resolved')
        .map((e) => {
          let text = e.label;
          if (e.confidence >= 4) text += ' (wiederholt beobachtet)';
          if (e.status === 'fading') text += ' (zeigt sich seltener)';
          if (e.example) text += ` — Beispiel: "${e.example}"`;
          return text;
        });

    const patterns  = byCategory('pattern');
    const strengths = byCategory('strength');
    const themes    = byCategory('theme');
    const values    = byCategory('value');
    const triggers  = byCategory('trigger');

    let fileBlock = `\n\n--- COACH-AKTE: DEINE BEOBACHTUNGEN ÜBER DIESEN MENSCHEN ---`;
    if (patterns.length)  fileBlock += `\nMuster:   ${patterns.join(' · ')}`;
    if (strengths.length) fileBlock += `\nStärken:  ${strengths.join(' · ')}`;
    if (themes.length)    fileBlock += `\nThemen:   ${themes.join(' · ')}`;
    if (values.length)    fileBlock += `\nWerte:    ${values.join(' · ')}`;
    if (triggers.length)  fileBlock += `\nTrigger:  ${triggers.join(' · ')}`;

    if (coachFile.profile) {
      const p = coachFile.profile;
      const ctx: string[] = [];
      if (p.occupation)           ctx.push(p.occupation);
      if (p.relationship_status)  ctx.push(p.relationship_status);
      if (p.family_situation)     ctx.push(p.family_situation);
      if (p.life_phase)           ctx.push(`Lebensphase: ${p.life_phase}`);
      if (p.current_focus)        ctx.push(`Fokus: ${p.current_focus}`);
      if (ctx.length) fileBlock += `\nKontext:  ${ctx.join(' · ')}`;
    }

    fileBlock += `\n\nWICHTIG: Nutze die Akte als stilles Fundament, nicht als Skript.
Erwähne Einträge nie direkt. Lass sie deine Fragen informieren.
Wenn es natürlich passt: "Du hast mir mal erzählt, dass..."
--- ENDE COACH-AKTE ---`;

    prompt += fileBlock;

  } else if (memory) {
    // Legacy-Fallback: user_memory für Nutzer ohne coach_file_entries
    const parts: string[] = [];
    if (memory.themes?.length)
      parts.push(`Wiederkehrende Themen: ${memory.themes.join(', ')}`);
    if (memory.patterns?.length)
      parts.push(`Bekannte Muster: ${memory.patterns.join(', ')}`);
    if (memory.strengths?.length)
      parts.push(`Ressourcen & Stärken: ${memory.strengths.join(', ')}`);
    if (memory.context && Object.keys(memory.context).length)
      parts.push(`Lebenskontext: ${JSON.stringify(memory.context)}`);

    if (parts.length) {
      prompt += `\n\n--- DEIN WISSEN ÜBER DIESEN MENSCHEN (Legacy) ---
${parts.join('\n')}
Nutze dieses Wissen subtil — erwähne es nicht direkt, aber lass es in deine Fragen einfließen.
--- ENDE ---`;
    }
  }

  // RAG: Anonyme Erfahrungen aus ähnlichen Gesprächen
  if (ragContext?.length) {
    prompt += `\n\n--- ERFAHRUNGEN AUS ÄHNLICHEN GESPRÄCHEN (anonym) ---
${ragContext.join('\n---\n')}
Nutze diese Erfahrungen als stille Orientierung.
Zitiere sie nie direkt. Lass sie deine Fragen informieren.
--- ENDE ---`;
  }

  // Supervision-Empfehlungen der aktuellen Woche
  if (supervisionNote) {
    prompt += `\n\n--- AKTUELLE COACH-EMPFEHLUNG (diese Woche) ---
${supervisionNote}
--- ENDE ---`;
  }

  // Wellness-Check: ersetzt die Standard-Eröffnung
  if (wellnessCheck) {
    const { score, label, emoji, context } = wellnessCheck;
    const followUpQuestion = SCALING_HINTS[score] ?? SCALING_HINTS[5];

    const toneInstruction =
      score <= 3
        ? `Sei besonders behutsam. Kein Druck, keine direkte Problemlösung. Gib zuerst Raum — der Mensch soll sich gehört fühlen, bevor irgendetwas exploriert wird. Deine erste Antwort darf kurz sein. Manchmal reicht ein einziger Satz des Ankommens, bevor du fragst.`
        : score <= 6
        ? `Bleib ruhig und neugierig. Der Mensch ist in einem mittleren Zustand — weder in einer Krise noch besonders gut drauf. Deine Aufgabe ist es, herauszufinden, was gerade wirklich da ist. Stelle eine öffnende Frage.`
        : `Der Mensch geht es gut. Nutze diesen Zustand, um Ressourcen oder Muster zu erkunden, die in schwierigeren Momenten verblassen. Frag nach, was diesen guten Zustand trägt — das ist systemisch wertvolles Material.`;

    const contextNote = context
      ? `Der Mensch hat seinen Zustand mit folgenden Worten beschrieben: "${context}". Beziehe dich auf diese Worte — nicht wortwörtlich, aber spürbar. Zeig, dass du zugehört hast.`
      : `Der Mensch hat keinen weiteren Kommentar gegeben. Frag offen, was hinter der Einschätzung steckt.`;

    prompt += `\n\n--- WELLNESS-CHECK KONTEXT ---
Der Mensch hat sich vor dem Gespräch selbst mit ${score}/10 eingeschätzt (${label} ${emoji}).

${contextNote}

DEINE ERSTE ANTWORT — PFLICHTSTRUKTUR:
1. Nimm die Einschätzung kurz auf. Spiegele das Gefühl dahinter — nenne die Zahl NICHT nochmals. Statt "Du hast dich mit 6 eingeschätzt" lieber: "Ein mittlerer Tag — das klingt nach mehr als 'okay'." Sei konkret auf den genannten Kontext (wenn vorhanden).
2. Stelle GENAU DIESE eine Folgefrage: "${followUpQuestion}"
   Du darfst die Frage leicht umformulieren, wenn es natürlicher klingt — aber der Kern muss erhalten bleiben.
3. Stelle danach KEINE weitere Frage. Warte auf die Antwort.

TON:
${toneInstruction}

WICHTIG:
- Maximal 3 Sätze insgesamt in dieser ersten Antwort.
- Kein "Hallo", kein "Schön, dass du da bist". Du bist bereits im Gespräch.
- Keine Ratschläge, keine Einschätzungen, keine Erklärungen.
--- ENDE WELLNESS-CHECK ---`;
  }

  return prompt;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    });
  }

  // Logger ohne requestId/userId für die Auth-Phase
  let logger = createLogger('chat');

  // Manuelle JWT-Verifikation (kompatibel mit ES256 und HS256)
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    logger.warn('missing authorization header');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  global: { headers: { Authorization: `Bearer ${token}` } },
  auth: { persistSession: false },
})
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    logger.warn('invalid token', { error: authError?.message });
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch (parseError: unknown) {
      logger.error('Failed to parse request body', parseError instanceof Error ? parseError : undefined);
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const { messages, memory, extractMemory, howtoMode, ragContext, supervisionNote, wellnessCheck, briefing, coachFile, requestId } = body as any;

    // Jetzt logger mit requestId + userId neu erstellen — alle weiteren Logs sind korrelierbar
    logger = createLogger('chat', requestId ?? undefined, user.id);

    logger.info('Request received', { requestId, messageCount: messages?.length ?? 0 });

    if (!Array.isArray(messages) && !extractMemory && !howtoMode && !wellnessCheck) {
      logger.error('Missing or invalid messages array', { received: typeof messages });
      return new Response(JSON.stringify({ error: 'Invalid messages' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      logger.error('ANTHROPIC_API_KEY not configured', { requestId });
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const anthropic = new Anthropic({ apiKey });

    // Gedächtnis-Extraktion nach Gesprächsende (kein Streaming, schnell via Haiku)
    if (extractMemory) {
      logger.info('Anthropic API call started', { requestId, model: 'claude-haiku-4-5-20251001', messageCount: messages.length });
      const conversationText = messages
        .map((m: any) => `${m.role === 'user' ? 'Nutzer' : 'Coach'}: ${m.content}`)
        .join('\n');

      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: `${MEMORY_EXTRACT_PROMPT}\n\nGespräch:\n${conversationText}`,
        }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
      try {
        const extracted = JSON.parse(text);
        return new Response(JSON.stringify(extracted), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch {
        logger.warn('memory extraction JSON parse failed', { raw: text.slice(0, 100) });
        return new Response('{}', {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // Normaler Chat — Streaming
    const systemPrompt = howtoMode
      ? HOWTO_SYSTEM_PROMPT
      : buildSystemPrompt(memory, ragContext, supervisionNote, wellnessCheck, briefing, coachFile);

    if (wellnessCheck) {
      const tone = wellnessCheck.score <= 3 ? 'behutsam' : wellnessCheck.score <= 6 ? 'neugierig' : 'ressourcenorientiert';
      logger.info('WellnessCheck context injected into prompt', { requestId, score: wellnessCheck.score, tone });
    }

    // Anthropic erfordert: messages muss mit user-Role beginnen und nicht leer sein.
    // Bei Wellness-Start ist messages leer oder beginnt mit assistant → synthetischen Trigger einfügen.
    let apiMessages: { role: string; content: string }[] = (messages ?? []).map((m: any) => ({
      role: m.role,
      content: m.content,
    }));
    if (apiMessages.length === 0 || apiMessages[0].role !== 'user') {
      apiMessages = [{ role: 'user', content: '.' }, ...apiMessages];
    }

    logger.info('Anthropic API call started', { requestId, model: 'claude-sonnet-4-5', messageCount: apiMessages.length });

    const streamStart = Date.now();
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-5',
      max_tokens: 400,
      system: systemPrompt,
      messages: apiMessages,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        let tokenCount = 0;
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' &&
                chunk.delta.type === 'text_delta') {
              tokenCount++;
              const data = `data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          logger.info('Stream completed', { requestId, tokenCount, duration_ms: Date.now() - streamStart });
        } catch (streamError: unknown) {
          logger.error('Stream error', streamError instanceof Error ? streamError : new Error(String(streamError)));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      }
    });

  } catch (error: unknown) {
    logger.error('Unhandled error in chat function', error instanceof Error ? error : new Error(String(error)));
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
});
