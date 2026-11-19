// supabase/functions/pre-session-briefing/index.ts
// Aufgerufen wenn ein Nutzer den Coach Screen öffnet.
// Gibt nur die Eckdaten zurück, die das Frontend für die Entscheidung über die
// Wiederkehr-Begrüßung braucht. Akte, Profil, Resonanzkarte und Gesprächsinhalte
// (Zusammenfassung, offener Faden) lädt chat selbst (Security S-12) und gehen
// nicht an den Client.
// Sicherheitsmuster v2: Identität nur aus dem JWT, alle Abfragen mit user.id.

import { createLogger, describeError } from '../_shared/logger.ts';
import { HttpError, requireUser, errorResponse, jsonResponse } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';

const CORS_HEADERS = corsHeaders('POST, OPTIONS');

Deno.serve(async (req) => {
  // CORS preflight — MUSS als erstes stehen
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  let logger = createLogger('pre-session-briefing');

  try {
    const { user, admin: supabase } = await requireUser(req);
    logger = createLogger('pre-session-briefing', undefined, user.id);

    // 1. Letztes abgeschlossenes Gespräch laden (mit summary)
    const { data: lastConv, error: lastConvError } = await supabase
      .from('conversations')
      .select('created_at, open_thread, open_thread_intensity')
      .eq('user_id', user.id)
      .not('summary', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastConvError) {
      logger.error('last conversation fetch failed', { code: lastConvError.code });
      throw new HttpError(500, 'briefing_failed');
    }

    if (!lastConv) {
      return jsonResponse({ briefing: null }, CORS_HEADERS);
    }

    // 2. Gesprächsanzahl gesamt
    const { count } = await supabase
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const daysSince = Math.floor(
      (Date.now() - new Date(lastConv.created_at).getTime()) / (1000 * 60 * 60 * 24),
    );

    const briefing = {
      daysSince,
      conversationCount: count ?? 1,
      openThread: lastConv.open_thread
        ? { intensity: lastConv.open_thread_intensity ?? 'low' }
        : null,
    };

    logger.info('Briefing built', { conversationCount: count ?? 0, hasOpenThread: !!lastConv.open_thread });
    return jsonResponse({ briefing }, CORS_HEADERS);

  } catch (error: unknown) {
    if (error instanceof HttpError) {
      if (error.status >= 500) logger.error('Request failed', { code: error.code, status: error.status });
      return errorResponse(error, CORS_HEADERS);
    }
    logger.error('Unhandled error', describeError(error));
    return errorResponse(error, CORS_HEADERS);
  }
});
