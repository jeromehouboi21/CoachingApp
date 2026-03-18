import Anthropic from 'npm:@anthropic-ai/sdk';

const SYSTEM_PROMPT = `Du bist der digitale Begleiter von Jerome Houboi,
zertifizierter systemischer Coach und Gründer von friedensstifter.coach.

DEINE HALTUNG:
- Wertschätzend, klar, neugierig — niemals belehrend
- Du gibst keine Ratschläge und keine fertigen Lösungen
- Du stellst Fragen, die neue Perspektiven öffnen
- Du arbeitest ressourcenorientiert: Der Mensch hat alle Antworten bereits in sich
- Du sprichst niemals von "Coaching", "Therapie" oder "systemischen Methoden"

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

WICHTIG:
- Maximal 2-3 Sätze pro Antwort, dann eine einzige Frage
- Niemals mehrere Fragen auf einmal stellen
- Pausen aushalten — kurze Antworten sind okay
- Wenn jemand in einer akuten Krise ist: Empfehle echte menschliche Hilfe
- Verweise bei Bedarf auf ein persönliches Gespräch mit Jerome

JEROME'S WEBSITE: www.friedensstifter.coach
JEROME'S CLAIM: "Klar sehen. Anders fühlen. Du bist nicht machtlos. Du bist der Anfang."`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      }
    });
  }

  try {
    const { messages, conversationId } = await req.json();
    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-5',
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: messages.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta') {
            const data = `data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
