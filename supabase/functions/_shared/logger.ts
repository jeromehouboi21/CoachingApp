// supabase/functions/_shared/logger.ts
// Strukturierter Logger für alle Edge Functions

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  ts: string;
  fn: string;
  level: LogLevel;
  msg: string;
  data?: Record<string, unknown>;
}

function emit(entry: LogEntry) {
  const line = JSON.stringify(entry);
  if (entry.level === 'error') {
    console.error(line);
  } else if (entry.level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function createLogger(functionName: string) {
  return {
    log(msg: string, data?: Record<string, unknown>) {
      emit({ ts: new Date().toISOString(), fn: functionName, level: 'info', msg, data });
    },
    warn(msg: string, data?: Record<string, unknown>) {
      emit({ ts: new Date().toISOString(), fn: functionName, level: 'warn', msg, data });
    },
    error(msg: string, data?: Record<string, unknown>) {
      emit({ ts: new Date().toISOString(), fn: functionName, level: 'error', msg, data });
    },
  };
}
