// supabase/functions/supervision/index.ts
// Läuft jeden Montag 06:00 via Supabase pg_cron
// Erstellt das wöchentliche Supervision-Protokoll für Jerome

import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js';

const SUPERVISION_PROMPT = `Du bist Jerome Houboi, zertifizierter systemischer Coach.
Hier sind die anonymisierten Selbstreflexionen deines KI-Coaches der letzten Woche:

{reflections}

Und hier ist das Nutzerfeedback der letzten Woche:
{feedback}

Erstelle ein kurzes Supervision-Protokoll (max. 200 Wörter) mit:
1. Was lief gut diese Woche?
2. Wo gibt es Verbesserungsbedarf?
3. Eine konkrete Empfehlung für die kommende Woche (in 1-2 Sätzen)

Schreibe direkt an den Coach — als würdest du ihn supervidieren.
Die Empfehlung in Punkt 3 fließt direkt in die KI ein. Sei präzise.`;

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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekStartISO = weekStart.toISOString();

    // Selbstreflexionen der letzten Woche
    const { data: reflections } = await supabase
      .from('coach_reflections')
      .select('what_worked, what_missed, resistance_detected, resistance_handled, improvement_note')
      .gte('created_at', weekStartISO);

    // Nutzerfeedback der letzten Woche
    const { data: feedback } = await supabase
      .from('user_feedback')
      .select('feedback_type, content, context')
      .gte('created_at', weekStartISO)
      .eq('consent_given', true);

    const totalConversations = reflections?.length ?? 0;
    const resistanceCount = reflections?.filter((r: any) => r.resistance_detected).length ?? 0;
    const breakthroughRate = 0; // Erfordert outcome-Auswertung aus experience_patterns

    if (totalConversations === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: 'no data' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const reflectionsText = (reflections ?? [])
      .map((r: any) => `- ${r.what_worked || ''} | ${r.what_missed || ''} | ${r.improvement_note || ''}`)
      .join('\n');

    const feedbackText = (feedback ?? []).length > 0
      ? (feedback ?? []).map((f: any) => `- [${f.feedback_type}] ${f.content}`).join('\n')
      : 'Kein explizites Feedback diese Woche.';

    const prompt = SUPERVISION_PROMPT
      .replace('{reflections}', reflectionsText)
      .replace('{feedback}', feedbackText);

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const supervisionText = response.content[0].type === 'text' ? response.content[0].text : '';

    // Extrahiere die Empfehlung (Punkt 3) als improvement_recs
    const improvementMatch = supervisionText.match(/3\.\s*(.+?)(?:\n|$)/s);
    const improvementRecs = improvementMatch?.[1]?.trim() || '';

    await supabase.from('supervision_logs').insert({
      week_start: weekStart.toISOString().split('T')[0],
      total_conversations: totalConversations,
      resistance_rate: totalConversations > 0 ? parseFloat((resistanceCount / totalConversations * 100).toFixed(2)) : 0,
      breakthrough_rate: breakthroughRate,
      improvement_recs: improvementRecs,
      raw_reflections: reflections ?? [],
    });

    return new Response(JSON.stringify({ ok: true, totalConversations }), {
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
