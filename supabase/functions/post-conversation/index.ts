// supabase/functions/post-conversation/index.ts
// Aufgerufen nach jedem abgeschlossenen Gespräch (fire-and-forget vom Frontend)
// Erstellt: (1) anonymen RAG-Eintrag, (2) Coach-Selbstreflexion

import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js';

const SUMMARY_PROMPT = `Analysiere dieses Coaching-Gespräch und erstelle eine
anonymisierte Zusammenfassung für eine Erfahrungs-Datenbank.

WICHTIG: Kein Name, kein Alter, keine Stadt, kein Beruf mit Arbeitgebernamen,
keine Details die Rückschlüsse auf eine konkrete Person erlauben.
Nur das Muster, nicht die Person.

Antworte NUR mit validem JSON:
{
  "context": "Themenfeld in 3-5 Wörtern",
  "pattern": "Erkanntes Verhaltensmuster (anonym)",
  "resistance": "Widerstandsmoment falls aufgetreten, sonst null",
  "what_helped": "Welche Coach-Reaktion war wirksam, sonst null",
  "what_blocked": "Was hat nicht geholfen, sonst null",
  "outcome": "breakthrough | stuck | partial | unknown"
}`;

const REFLECTION_PROMPT = `Du hast gerade dieses Coaching-Gespräch geführt.
Reflektiere dein eigenes Vorgehen ehrlich.

Antworte NUR mit validem JSON:
{
  "was_helpful": true oder false,
  "what_worked": "Was war wirksam?",
  "what_missed": "Was hättest du besser machen können?",
  "resistance_detected": true oder false,
  "resistance_handled": "Wie hast du mit Widerstand umgegangen, falls vorhanden, sonst null",
  "improvement_note": "Ein konkreter Hinweis für zukünftige ähnliche Gespräche"
}`;

async function generateEmbedding(text: string, openaiKey: string): Promise<number[] | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

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

    if (!messages || messages.length < 3) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    const conversationText = messages
      .map((m: any) => `${m.role === 'user' ? 'Nutzer' : 'Coach'}: ${m.content}`)
      .join('\n');

    // 1. Anonyme Zusammenfassung + RAG-Eintrag
    const [summaryResponse, reflectionResponse] = await Promise.all([
      anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{ role: 'user', content: `${SUMMARY_PROMPT}\n\nGespräch:\n${conversationText}` }],
      }),
      anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{ role: 'user', content: `${REFLECTION_PROMPT}\n\nGespräch:\n${conversationText}` }],
      }),
    ]);

    const summaryText = summaryResponse.content[0].type === 'text' ? summaryResponse.content[0].text : '{}';
    const reflectionText = reflectionResponse.content[0].type === 'text' ? reflectionResponse.content[0].text : '{}';

    let summary: any = {};
    let reflection: any = {};

    try { summary = JSON.parse(summaryText); } catch {}
    try { reflection = JSON.parse(reflectionText); } catch {}

    // 2. Embedding generieren (wenn OpenAI Key vorhanden)
    let embedding: number[] | null = null;
    if (openaiKey && summary.pattern) {
      const textToEmbed = [summary.context, summary.pattern, summary.what_helped]
        .filter(Boolean).join(' — ');
      embedding = await generateEmbedding(textToEmbed, openaiKey);
    }

    // 3. In experience_patterns speichern
    if (summary.context && summary.pattern) {
      const patternRow: any = {
        context: summary.context,
        pattern: summary.pattern,
        resistance: summary.resistance || null,
        what_helped: summary.what_helped || null,
        what_blocked: summary.what_blocked || null,
        outcome: summary.outcome || 'unknown',
      };
      if (embedding) patternRow.embedding = JSON.stringify(embedding);
      await supabase.from('experience_patterns').insert(patternRow);
    }

    // 4. Coach-Selbstreflexion speichern
    if (reflection.what_worked || reflection.improvement_note) {
      await supabase.from('coach_reflections').insert({
        conversation_id: conversationId || null,
        was_helpful: reflection.was_helpful ?? null,
        what_worked: reflection.what_worked || null,
        what_missed: reflection.what_missed || null,
        resistance_detected: reflection.resistance_detected ?? false,
        resistance_handled: reflection.resistance_handled || null,
        improvement_note: reflection.improvement_note || null,
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
});
