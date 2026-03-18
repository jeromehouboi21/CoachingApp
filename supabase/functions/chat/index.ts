import Anthropic from 'https://esm.sh/@anthropic-ai/sdk';

function createLogger(fn: string) {
  const ts = () => new Date().toISOString();
  return {
    log: (msg: string, data?: Record<string, unknown>) =>
      console.log(JSON.stringify({ ts: ts(), fn, level: 'info', msg, data })),
    warn: (msg: string, data?: Record<string, unknown>) =>
      console.warn(JSON.stringify({ ts: ts(), fn, level: 'warn', msg, data })),
    error: (msg: string, data?: Record<string, unknown>) =>
      console.error(JSON.stringify({ ts: ts(), fn, level: 'error', msg, data })),
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

function buildSystemPrompt(memory?: UserMemory, ragContext?: string[], supervisionNote?: string): string {
  let prompt = BASE_SYSTEM_PROMPT;

  // Nutzer-spezifisches Gedächtnis
  if (memory) {
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
      prompt += `\n\n--- DEIN WISSEN ÜBER DIESEN MENSCHEN ---
${parts.join('\n')}
Nutze dieses Wissen subtil — erwähne es nicht direkt, aber lass es in deine Fragen einfließen.
Wenn es passt, beziehe dich auf Bekanntes: "Du hast mir mal erzählt, dass..."
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

  return prompt;
}

const logger = createLogger('chat');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      }
    });
  }

  logger.log('request received', { method: req.method });

  try {
    const body = await req.json();
    const { messages, memory, extractMemory, howtoMode, ragContext, supervisionNote } = body;

    logger.log('request parsed', {
      mode: extractMemory ? 'extractMemory' : howtoMode ? 'howto' : 'chat',
      messageCount: messages?.length ?? 0,
      hasMemory: !!memory,
      hasRag: !!(ragContext?.length),
      hasSupervision: !!supervisionNote,
    });

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      logger.error('ANTHROPIC_API_KEY not set');
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const anthropic = new Anthropic({ apiKey });

    // Gedächtnis-Extraktion nach Gesprächsende (kein Streaming, schnell via Haiku)
    if (extractMemory) {
      logger.log('starting memory extraction', { messageCount: messages.length });
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
        logger.log('memory extraction complete');
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
      : buildSystemPrompt(memory, ragContext, supervisionNote);

    logger.log('starting stream', { model: 'claude-sonnet-4-5', systemPromptLength: systemPrompt.length });

    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-5',
      max_tokens: 400,
      system: systemPrompt,
      messages: messages.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        let chunkCount = 0;
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' &&
                chunk.delta.type === 'text_delta') {
              chunkCount++;
              const data = `data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          logger.log('stream complete', { chunkCount });
        } catch (streamError: unknown) {
          const msg = streamError instanceof Error ? streamError.message : 'stream error';
          logger.error('stream error', { error: msg, chunkCount });
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
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('unhandled error', { error: message });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
});
