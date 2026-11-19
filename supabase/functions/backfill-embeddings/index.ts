// supabase/functions/backfill-embeddings/index.ts
// Wartung: trägt fehlende Vektoren in experience_patterns nach (z. B. nachdem
// OpenAI wegen fehlenden Guthabens 429 geliefert hat). Idempotent — bearbeitet nur
// Zeilen mit embedding IS NULL. Gleicher Text wie in post-conversation:
// context — pattern — what_helped.
//
// Sicherheitsmuster v2: nur intern aufrufbar (requireInternalCaller), Aufruf aus dem
// SQL-Editor per net.http_post mit x-cron-secret aus Vault.
// Logs: nur Zähler und Fehlercodes, keine Inhalte.

import { createLogger, describeError } from '../_shared/logger.ts';
import { HttpError, requireInternalCaller, createAdminClient, errorResponse, jsonResponse } from '../_shared/auth.ts';
import { generateEmbedding } from '../_shared/rag.ts';
import { corsHeaders } from '../_shared/cors.ts';

const CORS_HEADERS = corsHeaders('POST, OPTIONS', { extraAllowedHeaders: ['x-cron-secret'] });

const BATCH_LIMIT = 100;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const logger = createLogger('backfill-embeddings');

  try {
    requireInternalCaller(req);

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) throw new HttpError(500, 'not_configured');

    const admin = createAdminClient();
    const { data: rows, error: selectError } = await admin
      .from('experience_patterns')
      .select('id, context, pattern, what_helped')
      .is('embedding', null)
      .limit(BATCH_LIMIT);
    if (selectError) {
      logger.error('experience_patterns select failed', { code: selectError.code });
      throw new HttpError(500, 'select_failed');
    }

    let updated = 0;
    let skipped = 0;
    const failures: Record<string, number> = {};
    const fail = (reason: string) => { failures[reason] = (failures[reason] ?? 0) + 1; };

    for (const row of rows ?? []) {
      const text = [row.context, row.pattern, row.what_helped].filter(Boolean).join(' — ').trim();
      if (!text) { skipped++; continue; }

      const { embedding, reason } = await generateEmbedding(text.slice(0, 2000), openaiKey);
      if (!embedding) { fail(reason ?? 'unknown'); continue; }

      const { error: updateError } = await admin
        .from('experience_patterns')
        .update({ embedding: JSON.stringify(embedding) })
        .eq('id', row.id)
        .is('embedding', null);
      if (updateError) { fail(`db_${updateError.code ?? 'unknown'}`); continue; }
      updated++;
    }

    const { count: remaining } = await admin
      .from('experience_patterns')
      .select('id', { count: 'exact', head: true })
      .is('embedding', null);

    const result = { candidates: rows?.length ?? 0, updated, skipped, failures, remaining: remaining ?? null };
    if (Object.keys(failures).length) logger.warn('Backfill finished with failures', result);
    else logger.info('Backfill finished', result);
    return jsonResponse(result, CORS_HEADERS);

  } catch (error: unknown) {
    if (error instanceof HttpError) {
      if (error.status === 401) logger.warn('Rejected non-internal caller');
      else if (error.status >= 500) logger.error('Request failed', { code: error.code, status: error.status });
      return errorResponse(error, CORS_HEADERS);
    }
    logger.error('Unhandled error', describeError(error));
    return errorResponse(error, CORS_HEADERS);
  }
});
