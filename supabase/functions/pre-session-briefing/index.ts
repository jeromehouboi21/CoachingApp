// supabase/functions/pre-session-briefing/index.ts
// Aufgerufen wenn ein Nutzer den Coach Screen öffnet.
// Gibt nur Eckdaten zurück: für die Eröffnung (Erstgespräch ja/nein) und seit U3 für den
// Gesprächseinstieg (die letzten 3 Gespräche mit neutralem Titel, ohne Inhalte) und die
// 2-Stunden-Regel. Akte, Profil, Resonanzkarte und Gesprächsinhalte (Zusammenfassung,
// offener Faden) lädt chat selbst (Security S-12) und gehen nicht an den Client.
// Sicherheitsmuster v2: Identität nur aus dem JWT, alle Abfragen mit user.id.

import { createLogger, describeError } from '../_shared/logger.ts';
import { HttpError, requireUser, errorResponse, jsonResponse } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';

const CORS_HEADERS = corsHeaders('POST, OPTIONS');

// Vom Client gesetzte Platzhalter (useChat) – kein echter Titel, Anzeige dann „Gespräch vom …“
const PLACEHOLDER_TITLES = new Set(['Neues Gespräch', 'Gespräch', 'Wellness-Check']);
const RECENT_LIMIT = 3;
const CANDIDATE_SCAN = 20;   // so viele jüngste Gespräche werden höchstens durchsucht

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

    // U3: Einstieg. Kandidaten = eigene Gespräche mit Aktivität, neueste zuerst. „Mit eigener
    // Nachricht“ prüfen wir je Kandidat (head-count), damit leere Pool-Eröffnungen nicht erscheinen.
    const { data: candidates, error: candError } = await supabase
      .from('conversations')
      .select('id, title, updated_at, summary, open_thread, open_thread_intensity')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(CANDIDATE_SCAN);
    if (candError) {
      logger.error('recent conversations fetch failed', { code: candError.code });
      throw new HttpError(500, 'briefing_failed');
    }
    // Weitersuchen, bis RECENT_LIMIT nachbearbeitete Gespräche gefunden sind – frische, noch nicht
    // nachbearbeitete Gespräche oben in der Liste dürfen die Weitermachen-Liste nicht verkürzen.
    const withUserMessage: typeof candidates = [];
    let processedFound = 0;
    for (const c of candidates ?? []) {
      const { count: userCount, error: countError } = await supabase
        .from('messages').select('id', { count: 'exact', head: true })
        .eq('conversation_id', c.id).eq('role', 'user');
      if (countError) {
        logger.error('recent conversation count failed', { code: countError.code });
        throw new HttpError(500, 'briefing_failed');
      }
      if ((userCount ?? 0) > 0) {
        withUserMessage.push(c);
        if (c.summary) processedFound++;
      }
      if (processedFound >= RECENT_LIMIT) break;
    }
    const latest = withUserMessage[0] ?? null;
    const latestActiveConversation = latest ? { id: latest.id, lastMessageAt: latest.updated_at } : null;
    // Nur Gespräche, die schon nachbearbeitet sind (summary), kommen in die Weitermachen-Liste.
    const recent = withUserMessage
      .filter((c) => c.summary)
      .slice(0, RECENT_LIMIT)
      .map((c) => {
        const moving = c.open_thread_intensity === 'high';
        const realTitle = typeof c.title === 'string' && c.title.trim() && !PLACEHOLDER_TITLES.has(c.title.trim())
          ? c.title.trim() : null;
        return {
          id: c.id,
          title: moving ? null : realTitle,   // bei hoher Intensität kein Thema (UX-Konzept 4.2a)
          lastActivityAt: c.updated_at,
          hasOpenThread: !!c.open_thread,
          moving,
        };
      });

    if (!lastConv) {
      return jsonResponse({ briefing: null, recent, latestActiveConversation }, CORS_HEADERS);
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

    logger.info('Briefing built', { conversationCount: count ?? 0, hasOpenThread: !!lastConv.open_thread, recentCount: recent.length });
    return jsonResponse({ briefing, recent, latestActiveConversation }, CORS_HEADERS);

  } catch (error: unknown) {
    if (error instanceof HttpError) {
      if (error.status >= 500) logger.error('Request failed', { code: error.code, status: error.status });
      return errorResponse(error, CORS_HEADERS);
    }
    logger.error('Unhandled error', describeError(error));
    return errorResponse(error, CORS_HEADERS);
  }
});
