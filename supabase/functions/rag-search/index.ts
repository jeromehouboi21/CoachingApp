// supabase/functions/rag-search/index.ts
// Aufgerufen beim Start eines neuen Gesprächs mit der ersten Nutzer-Nachricht.
// Gibt Top-3 semantisch ähnliche anonyme Erfahrungen zurück.
// Sicherheitsmuster v2: nur für eingeloggte Nutzer, Query-Text max. 2.000 Zeichen.

import { createLogger, describeError } from '../_shared/logger.ts';
import { HttpError, requireUser, readJsonBody, errorResponse, jsonResponse } from '../_shared/auth.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_QUERY_CHARS = 2000;
const MAX_BODY_BYTES = 16 * 1024;

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
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  let logger = createLogger('rag-search');

  try {
    const { user, admin } = await requireUser(req);
    logger = createLogger('rag-search', undefined, user.id);

    const body = await readJsonBody(req, MAX_BODY_BYTES);
    const firstMessage = typeof body.firstMessage === 'string' ? body.firstMessage.trim().slice(0, MAX_QUERY_CHARS) : '';
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    // Ohne OpenAI Key kein RAG — leeres Array zurückgeben
    if (!openaiKey || !firstMessage) {
      return jsonResponse({ experiences: [] }, CORS_HEADERS);
    }

    const embedding = await generateEmbedding(firstMessage, openaiKey);
    if (!embedding) {
      logger.warn('embedding failed');
      return jsonResponse({ experiences: [] }, CORS_HEADERS);
    }

    const { data: similar, error } = await admin.rpc('match_experiences', {
      query_embedding: embedding,
      match_threshold: 0.78,
      match_count: 3,
    });

    if (error) {
      logger.error('match_experiences failed', { code: error.code });
      return jsonResponse({ experiences: [] }, CORS_HEADERS);
    }
    if (!similar?.length) {
      return jsonResponse({ experiences: [] }, CORS_HEADERS);
    }

    // Formatiere für den System-Prompt (lesbare Strings)
    const experiences: string[] = similar.map((row: any) => {
      const parts = [`Kontext: ${row.context}`, `Muster: ${row.pattern}`];
      if (row.what_helped) parts.push(`Was half: ${row.what_helped}`);
      if (row.resistance) parts.push(`Widerstand: ${row.resistance}`);
      return parts.join(' | ');
    });

    logger.info('RAG results', { count: experiences.length });
    return jsonResponse({ experiences }, CORS_HEADERS);

  } catch (error: unknown) {
    if (error instanceof HttpError) {
      if (error.status >= 500) logger.error('Request failed', { code: error.code, status: error.status });
      return errorResponse(error, CORS_HEADERS);
    }
    logger.error('Unhandled error', describeError(error));
    return errorResponse(error, CORS_HEADERS);
  }
});
