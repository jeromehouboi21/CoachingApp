// supabase/functions/delete-account/index.ts
// Löscht alle Nutzerdaten und den Auth-Account.
// Benötigt service_role — der anon-Key hat keine DELETE-Rechte auf auth.users.
// Sicherheitsmuster v2: löscht ausschließlich user.id aus dem JWT, ignoriert jede ID aus dem Body.

import { createLogger, describeError } from '../_shared/logger.ts';
import { HttpError, requireUser, errorResponse, jsonResponse } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';

const CORS_HEADERS = corsHeaders('POST, GET, OPTIONS');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  let logger = createLogger('delete-account');

  try {
    const { user, admin: supabase } = await requireUser(req);
    const userId = user.id;
    logger = createLogger('delete-account', undefined, userId);

    const failures: string[] = [];
    const check = (table: string, error: { code?: string } | null) => {
      if (error) {
        failures.push(table);
        logger.error('delete failed', { table, code: error.code ?? null });
      }
    };

    // Schritt 1: Conversation IDs zuerst separat laden
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', userId);
    check('conversations(select)', convError);

    const conversationIds = conversations?.map((c: { id: string }) => c.id) ?? [];

    // Schritt 2: Messages nur löschen wenn IDs vorhanden
    if (conversationIds.length > 0) {
      const { error } = await supabase.from('messages').delete().in('conversation_id', conversationIds);
      check('messages', error);
    }

    // Dann der Rest parallel
    const tables = ['insights', 'pattern_references', 'user_feedback', 'coach_file_entries', 'coachee_profile',
      'session_notes', 'resonance_map', 'user_memory'];
    const results = await Promise.all(tables.map((t) => supabase.from(t).delete().eq('user_id', userId)));
    results.forEach((r, i) => check(tables[i], r.error));

    // Gespräche löschen (Nachrichten sind bereits weg)
    check('conversations', (await supabase.from('conversations').delete().eq('user_id', userId)).error);

    // Profil löschen
    check('profiles', (await supabase.from('profiles').delete().eq('id', userId)).error);

    // Kein stilles Scheitern: Wenn ein Schritt fehlschlägt, bleibt der Auth-Account
    // bestehen, damit die Löschung wiederholt werden kann.
    if (failures.length > 0) {
      logger.error('delete_incomplete', { failedSteps: failures.join(',') });   // überwacht S-22
      return jsonResponse({ error: 'delete_incomplete' }, CORS_HEADERS, 500);
    }

    // Auth-User löschen — erfordert service_role. inner_voices, crisis_events und
    // feedback_surveys hängen per ON DELETE CASCADE an auth.users.
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      logger.error('auth_delete_failed', describeError(deleteError));   // überwacht S-22
      return jsonResponse({ error: 'auth_delete_failed' }, CORS_HEADERS, 500);
    }

    // Ohne user_id loggen: Das Profil existiert nicht mehr (FK app_logs.user_id → profiles).
    createLogger('delete-account').info('Account deleted', { tableCount: tables.length + 3 });
    return jsonResponse({ success: true }, CORS_HEADERS);

  } catch (error: unknown) {
    if (error instanceof HttpError) {
      if (error.status >= 500) logger.error('Request failed', { code: error.code, status: error.status });
      return errorResponse(error, CORS_HEADERS);
    }
    logger.error('delete-account error', describeError(error));
    return errorResponse(error, CORS_HEADERS);
  }
});
