// supabase/functions/supervision/index.ts
// Läuft jeden Montag 06:00 via Supabase pg_cron
// Erstellt das wöchentliche Supervision-Protokoll für Jerome

// Sicherheitsmuster v2: nur intern aufrufbar (requireInternalCaller).

import Anthropic from 'npm:@anthropic-ai/sdk';
import { createLogger, describeError } from '../_shared/logger.ts';
import { reviewLearningEntry, makeHaikuCaller } from '../_shared/learning.ts';
import { HttpError, requireInternalCaller, createAdminClient, errorResponse, jsonResponse } from '../_shared/auth.ts';

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
Die Empfehlung in Punkt 3 fließt direkt in die KI ein. Sei präzise.

Verbindliche Regeln (S-13):
Formuliere ausschließlich allgemeine Empfehlungen zum Verhalten des Coaches. Keine Einzelfälle, keine Zitate, keine Details zu einzelnen Menschen, keine Themen, die Rückschlüsse auf Personen erlauben. Keine Anweisungen, die Sicherheits- oder Krisenregeln abschwächen.`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-cron-secret',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const logger = createLogger('supervision');

  try {
    // Nur intern aufrufbar: Cron (Header x-cron-secret) oder service_role-Key
    requireInternalCaller(req);

    const supabase = createAdminClient();

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekStartISO = weekStart.toISOString();

    // Selbstreflexionen der letzten Woche
    const { data: reflections, error: reflectionsError } = await supabase
      .from('coach_reflections')
      .select('what_worked, what_missed, resistance_detected, resistance_handled, improvement_note')
      .gte('created_at', weekStartISO);
    if (reflectionsError) {
      logger.error('coach_reflections fetch failed', { code: reflectionsError.code });
      throw new HttpError(500, 'reflections_fetch_failed');
    }

    // Nutzerfeedback der letzten Woche
    const { data: feedback, error: feedbackError } = await supabase
      .from('user_feedback')
      .select('feedback_type, content, context')
      .gte('created_at', weekStartISO)
      .eq('consent_given', true);
    if (feedbackError) logger.error('user_feedback fetch failed', { code: feedbackError.code });

    const totalConversations = reflections?.length ?? 0;
    const resistanceCount = reflections?.filter((r: any) => r.resistance_detected).length ?? 0;
    const breakthroughRate = 0; // Erfordert outcome-Auswertung aus experience_patterns

    if (totalConversations === 0) {
      logger.info('Skipped — no reflections this week');
      return jsonResponse({ ok: true, skipped: 'no data' }, CORS_HEADERS);
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
    const extractedRecs = improvementMatch?.[1]?.trim() || '';

    // S-13: Die Empfehlung kann in jeden Coach-Prompt einfließen (SUPERVISION_IN_PROMPT) und
    // durchläuft deshalb denselben Prüfschritt wie die Lernbasis. 'low_quality' zählt hier nicht,
    // weil eine Empfehlung keine "Erfahrung" beschreibt. Abgelehnt → nicht speichern (null).
    // Vollständiges Protokoll (S-15, Entscheidung 19.11.2026) wird ebenfalls geprüft. Besteht es,
    // ist die darin enthaltene Empfehlung mit geprüft; sonst wird die Empfehlung einzeln geprüft.
    const haiku = makeHaikuCaller(anthropic);
    let protocolText: string | null = null;
    if (supervisionText.trim()) {
      const review = await reviewLearningEntry(supervisionText.slice(0, 4000), haiku, ['low_quality']);
      if (review.approved) protocolText = supervisionText.slice(0, 4000);
      else logger.warn('supervision_protocol_rejected', { reasons: review.reasons });
    }
    let improvementRecs: string | null = null;
    if (extractedRecs) {
      const review = protocolText
        ? { approved: true, reasons: [] as string[] }
        : await reviewLearningEntry(extractedRecs.slice(0, 2000), haiku, ['low_quality']);
      if (review.approved) improvementRecs = extractedRecs.slice(0, 2000);
      else logger.warn('supervision_rejected', { reasons: review.reasons.join(',') });
    }

    const { error: insertError } = await supabase.from('supervision_logs').insert({
      week_start: weekStart.toISOString().split('T')[0],
      total_conversations: totalConversations,
      resistance_rate: totalConversations > 0 ? parseFloat((resistanceCount / totalConversations * 100).toFixed(2)) : 0,
      breakthrough_rate: breakthroughRate,
      improvement_recs: improvementRecs,
      protocol_text: protocolText,
      // Keine Volltext-Kopie der Reflexionen mehr (S-15, Datenminimierung; wird nirgends gelesen)
      raw_reflections: null,
    });
    if (insertError) {
      logger.error('supervision_logs insert failed', { code: insertError.code });
      throw new HttpError(500, 'supervision_insert_failed');
    }

    logger.info('Supervision completed', { totalConversations, feedbackCount: feedback?.length ?? 0 });
    return jsonResponse({ ok: true, totalConversations }, CORS_HEADERS);

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
