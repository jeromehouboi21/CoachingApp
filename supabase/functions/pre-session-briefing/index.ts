// supabase/functions/pre-session-briefing/index.ts
// Aufgerufen wenn ein Nutzer den Coach Screen öffnet.
// Gibt das Briefing-Objekt zurück — das Frontend entscheidet ob eine
// Wiederkehr-Begrüßung gezeigt wird.

import { createClient } from 'npm:@supabase/supabase-js';

Deno.serve(async (req) => {
  // CORS preflight — MUSS als erstes stehen
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // User aus Token ermitteln
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // 1. Letztes abgeschlossenes Gespräch laden (mit summary)
    const { data: lastConv } = await supabase
      .from('conversations')
      .select('id, created_at, summary, open_thread, open_thread_intensity, title')
      .eq('user_id', user.id)
      .not('summary', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!lastConv) {
      return new Response(JSON.stringify({ briefing: null }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
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

    return new Response(JSON.stringify({ briefing, coachFile }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
