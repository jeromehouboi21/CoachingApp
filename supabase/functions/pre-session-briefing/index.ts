// supabase/functions/pre-session-briefing/index.ts
// Aufgerufen wenn ein Nutzer den Coach Screen öffnet.
// Gibt das Briefing-Objekt zurück — das Frontend entscheidet ob eine
// Wiederkehr-Begrüßung gezeigt wird.
// Sicherheitsmuster v2: Identität nur aus dem JWT, alle Abfragen mit user.id.

import { createLogger, describeError } from '../_shared/logger.ts';
import { HttpError, requireUser, errorResponse, jsonResponse } from '../_shared/auth.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      .select('id, created_at, summary, open_thread, open_thread_intensity, title')
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

    // 3. Relative Zeitangabe berechnen
    const daysSince = Math.floor(
      (Date.now() - new Date(lastConv.created_at).getTime()) / (1000 * 60 * 60 * 24),
    );
    const dateLabel =
      daysSince === 0 ? 'heute' :
      daysSince === 1 ? 'gestern' :
      daysSince < 7   ? `vor ${daysSince} Tagen` :
      daysSince < 14  ? 'letzte Woche' :
                        `vor ${Math.floor(daysSince / 7)} Wochen`;

    // 4. Coach-Akte + Personenprofil + Resonanzkarte laden (für buildSystemPrompt)
    const [{ data: fileEntries }, { data: coacheeProfile }, { data: resonanceMap }] = await Promise.all([
      supabase
        .from('coach_file_entries')
        .select('id, category, label, description, example, confidence, status')
        .eq('user_id', user.id)
        .neq('status', 'resolved')
        .order('confidence', { ascending: false }),
      supabase
        .from('coachee_profile')
        .select('occupation, relationship_status, family_situation, life_phase, current_focus, known_values, known_stressors, known_resources')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('resonance_map')
        .select('opening_patterns, closing_patterns, effective_styles, resonant_metaphors, preferred_pace')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    // 5. Briefing + coachFile zusammenstellen
    const briefing = {
      lastConversationDate: dateLabel,
      daysSince,
      lastTopicSummary: lastConv.summary,
      conversationCount: count ?? 1,
      openThread: lastConv.open_thread ? {
        text: lastConv.open_thread,
        intensity: lastConv.open_thread_intensity ?? 'low',
        topicHint: lastConv.title ?? undefined,
        conversationDate: dateLabel,
      } : null,
    };

    const coachFile = {
      entries: fileEntries ?? [],
      profile: coacheeProfile ?? undefined,
      resonanceMap: resonanceMap ?? undefined,
    };

    logger.info('Briefing built', { conversationCount: count ?? 0, entryCount: fileEntries?.length ?? 0, hasOpenThread: !!lastConv.open_thread });
    return jsonResponse({ briefing, coachFile }, CORS_HEADERS);

  } catch (error: unknown) {
    if (error instanceof HttpError) {
      if (error.status >= 500) logger.error('Request failed', { code: error.code, status: error.status });
      return errorResponse(error, CORS_HEADERS);
    }
    logger.error('Unhandled error', describeError(error));
    return errorResponse(error, CORS_HEADERS);
  }
});
