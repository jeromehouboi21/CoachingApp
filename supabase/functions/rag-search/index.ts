// supabase/functions/rag-search/index.ts
// Aufgerufen beim Start eines neuen Gesprächs mit der ersten Nutzer-Nachricht.
// Gibt Top-3 semantisch ähnliche anonyme Erfahrungen zurück.

import { createClient } from 'npm:@supabase/supabase-js';

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
    const { firstMessage } = await req.json();
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    // Ohne OpenAI Key kein RAG — leeres Array zurückgeben
    if (!openaiKey || !firstMessage?.trim()) {
      return new Response(JSON.stringify({ experiences: [] }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const embedding = await generateEmbedding(firstMessage, openaiKey);
    if (!embedding) {
      return new Response(JSON.stringify({ experiences: [] }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: similar, error } = await supabase.rpc('match_experiences', {
      query_embedding: embedding,
      match_threshold: 0.78,
      match_count: 3,
    });

    if (error || !similar?.length) {
      return new Response(JSON.stringify({ experiences: [] }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Formatiere für den System-Prompt (lesbare Strings)
    const experiences: string[] = similar.map((row: any) => {
      const parts = [`Kontext: ${row.context}`, `Muster: ${row.pattern}`];
      if (row.what_helped) parts.push(`Was half: ${row.what_helped}`);
      if (row.resistance) parts.push(`Widerstand: ${row.resistance}`);
      return parts.join(' | ');
    });

    return new Response(JSON.stringify({ experiences }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message, experiences: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
});
