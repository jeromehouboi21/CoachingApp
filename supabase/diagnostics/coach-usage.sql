-- Kosten je Gespräch der letzten 14 Tage (Sonnet 5.5: 2 $ / 10 $ pro MTok) – T0, Schritt 8.
-- Liefert nur IDs und Zähler (Log-Regel). app_logs wird nach 30 Tagen gelöscht (Migration 026).
select
  metadata->>'conversationId'                                   as conversation_id,
  metadata->>'mode'                                             as mode,
  count(*)                                                      as coach_calls,
  sum((metadata->>'inputTokens')::int)                          as input_tokens,
  sum((metadata->>'outputTokens')::int)                         as output_tokens,
  round(( sum((metadata->>'inputTokens')::int)  * 2.0
        + sum((metadata->>'outputTokens')::int) * 10.0) / 1e6, 4) as est_usd
from public.app_logs
where source = 'chat' and message = 'coach_usage' and origin = 'server'
  and created_at > now() - interval '14 days'
group by 1, 2
order by est_usd desc;

-- Prüfung nach dem Deploy: Fehler- und Qualitätscodes der letzten 24 Stunden
select message, count(*) as n
from public.app_logs
where origin = 'server'
  and message in ('coach_usage', 'coach_response_truncated', 'coach_response_unexpected_stop',
                  'empty_text_response', 'synthetic_user_turn_added', 'Stream error', 'assistant_empty')
  and created_at > now() - interval '24 hours'
group by 1
order by 1;
