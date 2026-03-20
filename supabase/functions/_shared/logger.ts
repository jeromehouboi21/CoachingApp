// supabase/functions/_shared/logger.ts
// Zentraler Logger für alle Edge Functions — schreibt in app_logs via Service Role Key

import { createClient } from 'npm:@supabase/supabase-js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level:         LogLevel;
  source:        string;
  message:       string;
  request_id?:   string;
  user_id?:      string;
  metadata?:     Record<string, unknown>;
  error_detail?: string;
  stack_trace?:  string;
}

export function createLogger(source: string, requestId?: string, userId?: string) {
  // Service Role Key bypassed RLS — Edge Functions schreiben immer durch
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const persist = async (entry: LogEntry) => {
    // Immer in die Konsole (erscheint im Supabase Edge Function Log-Tab)
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level: entry.level,
      source: entry.source,
      msg: entry.message,
      request_id: entry.request_id,
      ...(entry.metadata ? { data: entry.metadata } : {}),
      ...(entry.error_detail ? { error: entry.error_detail } : {}),
    });
    if (entry.level === 'error')     console.error(line);
    else if (entry.level === 'warn') console.warn(line);
    else                             console.log(line);

    // debug nur in Konsole — nicht in DB (zu viel Rauschen)
    if (entry.level === 'debug') return;

    // info, warn, error → in app_logs schreiben
    const { error } = await supabase.from('app_logs').insert({
      level:        entry.level,
      source:       entry.source,
      message:      entry.message,
      request_id:   entry.request_id ?? requestId ?? null,
      user_id:      entry.user_id    ?? userId    ?? null,
      metadata:     entry.metadata   ?? null,
      error_detail: entry.error_detail ?? null,
      stack_trace:  entry.stack_trace  ?? null,
    });

    // Wenn das Logging selbst fehlschlägt: nur Konsole, nie crashen
    if (error) {
      console.error(JSON.stringify({
        level: 'error',
        source: 'logger',
        message: 'Failed to persist log entry to app_logs',
        error_detail: error.message,
      }));
    }
  };

  const log = (level: LogLevel, message: string, data?: unknown) => {
    const entry: LogEntry = {
      level, source, message,
      request_id: requestId,
      user_id: userId,
      ...(data instanceof Error
        ? { error_detail: data.message, stack_trace: data.stack }
        : data ? { metadata: data as Record<string, unknown> } : {}
      ),
    };
    persist(entry); // fire-and-forget
  };

  return {
    debug: (msg: string, data?: unknown) => log('debug', msg, data),
    info:  (msg: string, data?: unknown) => log('info',  msg, data),
    warn:  (msg: string, data?: unknown) => log('warn',  msg, data),
    error: (msg: string, data?: unknown) => log('error', msg, data),

    time: (label: string) => {
      const start = Date.now();
      return {
        end: (msg: string, meta?: Record<string, unknown>) => {
          log('info', msg, { ...(meta ?? {}), label, duration_ms: Date.now() - start });
        }
      };
    },
  };
}
