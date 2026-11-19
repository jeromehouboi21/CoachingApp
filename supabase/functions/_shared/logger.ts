// supabase/functions/_shared/logger.ts
// Zentraler Logger für alle Edge Functions — schreibt in app_logs via Service Role Key.
//
// LOG-REGEL (Security-Paket A, S-04):
// Erlaubt: IDs (userId, conversationId, requestId), Zähler, Längen, Dauer, HTTP-Status,
//          Fehlercodes, Fehlertyp, Prompt-Label.
// Verboten: Nachrichteninhalte, Prompts, Modellausgaben (auch nicht als Preview), Akte-,
//          Profil- und Stimmen-Felder, Zusammenfassungen, E-Mail-Adressen, Namen.
// JSON.parse-Fehlermeldungen enthalten Textausschnitte → nie loggen, nur 'parse_failed'.
// sanitizeLogData() ist nur das Sicherheitsnetz — die Aufrufstellen bleiben verantwortlich.

import { createClient } from 'npm:@supabase/supabase-js@2.119.0';

// EdgeRuntime ist global in Supabase Edge Functions verfügbar, aber nicht Teil
// der Standard-Deno-Typen — deshalb hier deklariert statt @ts-ignore an jeder
// Aufrufstelle.
declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void } | undefined;

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

const SENSITIVE_KEY = /^(content|contents|messages|text|prompt|system_?prompt|output|raw|raw_?output|raw_?response_?preview|preview|email|invited_?email|display_?name|full_?name|name|excerpt|description|example|summary|open_?thread|main_?topic|notes?|linked_?value|coach_?file|memory|briefing|rag_?context|wellness_?context|details|hint|body|topic|pattern)$/i;
const MAX_STRING = 200;

export function sanitizeLogData(value: unknown, depth = 0): unknown {
  if (value == null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (depth > 4) return '[depth-limit]';
  if (typeof value === 'string') return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…[+${value.length - MAX_STRING}]` : value;
  if (Array.isArray(value)) return { type: 'array', length: value.length };
  if (value instanceof Error) return { name: value.name, code: (value as { code?: unknown }).code ?? null };
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY.test(k)
        ? { redacted: true, ...(typeof v === 'string' ? { length: v.length } : {}) }
        : sanitizeLogData(v, depth + 1);
    }
    return out;
  }
  return String(value);
}

/** Fehler auf loggbare Felder reduzieren: Typ, Code, HTTP-Status — keine Meldungstexte mit Inhalten. */
export function describeError(err: unknown): Record<string, unknown> {
  if (err instanceof SyntaxError) return { errorType: 'SyntaxError', parseError: 'parse_failed' };
  if (err && typeof err === 'object') {
    const e = err as { name?: unknown; code?: unknown; status?: unknown };
    return {
      errorType: typeof e.name === 'string' ? e.name : 'Error',
      ...(e.code != null ? { code: String(e.code) } : {}),
      ...(typeof e.status === 'number' ? { status: e.status } : {}),
    };
  }
  return { errorType: typeof err };
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
        code: error.code ?? null,
      }));
    }
  };

  const log = (level: LogLevel, message: string, data?: unknown) => {
    // Fehler: nur Typ/Code und eine gekürzte Meldung, Stacktrace gekürzt.
    // Alles andere läuft durch das Redaction-Netz.
    const entry: LogEntry = {
      level, source, message,
      request_id: requestId,
      user_id: userId,
      ...(data instanceof Error
        ? {
            metadata: describeError(data),
            error_detail: data instanceof SyntaxError ? 'parse_failed' : data.message.slice(0, MAX_STRING),
            stack_trace: data.stack?.slice(0, 2000),
          }
        : data ? { metadata: sanitizeLogData(data) as Record<string, unknown> } : {}
      ),
    };
    const promise = persist(entry);

    // Promise am Leben halten, auch nachdem die Response schon raus ist.
    // Ohne das kann die Isolate den Insert abschneiden, bevor er ankommt.
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) {
      EdgeRuntime.waitUntil(promise);
    } else {
      // Lokaler Dev-Server / Fallback: zumindest unhandled rejections vermeiden
      promise.catch(() => {});
    }
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

export type Logger = ReturnType<typeof createLogger>;
