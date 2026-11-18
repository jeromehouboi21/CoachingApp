// supabase/functions/_shared/rag.ts
// Semantische Suche in experience_patterns (anonyme Erfahrungen aus früheren Gesprächen).
// Läuft ausschließlich serverseitig (chat). Die Ergebnisse gehen nie an den Client.

// deno-lint-ignore no-explicit-any
type AdminClient = any;

const MAX_QUERY_CHARS = 2000;
const EMBEDDING_TIMEOUT_MS = 2500;

// Fehlergrund nur als Code (HTTP-Status oder 'timeout'/'network'/'no_embedding'), nie Antworttext
async function generateEmbedding(text: string, openaiKey: string): Promise<{ embedding: number[] | null; reason?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EMBEDDING_TIMEOUT_MS);
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
      signal: controller.signal,
    });
    if (!response.ok) return { embedding: null, reason: `http_${response.status}` };
    const data = await response.json();
    const embedding = data.data?.[0]?.embedding ?? null;
    return embedding ? { embedding } : { embedding: null, reason: 'no_embedding' };
  } catch (err) {
    return { embedding: null, reason: err instanceof DOMException && err.name === 'AbortError' ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timer);
  }
}

export type RagResult =
  | { status: 'ok'; experiences: string[] }
  | { status: 'skipped' | 'embedding_failed' | 'match_failed'; experiences: string[]; code?: string };

/** Top-3 ähnliche anonyme Erfahrungen als lesbare Strings für den System-Prompt. */
export async function findSimilarExperiences(admin: AdminClient, queryText: string): Promise<RagResult> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  const text = queryText.trim().slice(0, MAX_QUERY_CHARS);
  if (!openaiKey || !text) return { status: 'skipped', experiences: [] };

  const { embedding, reason } = await generateEmbedding(text, openaiKey);
  if (!embedding) return { status: 'embedding_failed', experiences: [], code: reason };

  const { data: similar, error } = await admin.rpc('match_experiences', {
    query_embedding: embedding,
    match_threshold: 0.78,
    match_count: 3,
  });
  if (error) return { status: 'match_failed', experiences: [], code: error.code };

  // deno-lint-ignore no-explicit-any
  const experiences: string[] = (similar ?? []).map((row: any) => {
    const parts = [`Kontext: ${row.context}`, `Muster: ${row.pattern}`];
    if (row.what_helped) parts.push(`Was half: ${row.what_helped}`);
    if (row.resistance) parts.push(`Widerstand: ${row.resistance}`);
    return parts.join(' | ');
  });
  return { status: 'ok', experiences };
}
