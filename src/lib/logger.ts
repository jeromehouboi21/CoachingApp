// src/lib/logger.ts
// Frontend-Logger: console in dev, Supabase app_logs in prod (nur eingeloggt).
//
// LOG-REGEL (Security-Paket A, S-04): Erlaubt sind IDs, Zähler, Längen, Dauer,
// HTTP-Status, Fehlercodes. Verboten sind Inhalte (Nachrichten, Akte, Profil,
// Stimmen, Zusammenfassungen), E-Mail-Adressen, Namen und Einladungscodes.
// sanitizeLogData() ist nur das Sicherheitsnetz — die Aufrufstellen bleiben verantwortlich.

import { supabase } from './supabase'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

// Globale User-ID — wird in useAuth nach dem Login gesetzt
let currentUserId: string | null = null
export function setLoggerUserId(id: string | null) {
  currentUserId = id
}

const isDev = import.meta.env.DEV

const SENSITIVE_KEY = /^(content|contents|messages|text|prompt|system_?prompt|output|raw|raw_?output|preview|email|display_?name|full_?name|name|excerpt|description|example|summary|open_?thread|main_?topic|notes?|linked_?value|coach_?file|memory|briefing|rag_?context|wellness_?context|details|hint|body|topic|code_?value|invite_?code|pending_?code)$/i
const MAX_STRING = 200

export function sanitizeLogData(value: unknown, depth = 0): unknown {
  if (value == null || typeof value === 'number' || typeof value === 'boolean') return value
  if (depth > 4) return '[depth-limit]'
  if (typeof value === 'string') return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…[+${value.length - MAX_STRING}]` : value
  if (Array.isArray(value)) return { type: 'array', length: value.length }
  if (value instanceof Error) return { name: value.name, code: (value as { code?: unknown }).code ?? null }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY.test(k)
        ? { redacted: true, ...(typeof v === 'string' ? { length: v.length } : {}) }
        : sanitizeLogData(v, depth + 1)
    }
    return out
  }
  return String(value)
}

let persistWarningShown = false

async function persist(entry: {
  level: LogLevel
  source: string
  message: string
  request_id?: string
  metadata?: Record<string, unknown>
  error_detail?: string
  stack_trace?: string
}): Promise<void> {
  if (entry.level === 'debug') return // debug nur Konsole, nicht DB
  if (!currentUserId) return          // vor dem Login nur Konsole (app_logs nimmt nur eigene Zeilen an)

  const { error } = await supabase.from('app_logs').insert({
    level:        entry.level,
    source:       entry.source,
    message:      entry.message,
    request_id:   entry.request_id ?? null,
    user_id:      currentUserId,
    metadata:     entry.metadata   ?? null,
    error_detail: entry.error_detail ?? null,
    stack_trace:  entry.stack_trace  ?? null,
  })

  // Einmalig warnen, ohne Endlosschleife (nicht über den Logger selbst)
  if (error && !persistWarningShown) {
    persistWarningShown = true
    console.warn('[logger] Failed to persist to app_logs:', error.code ?? 'unknown')
  }
}

export function createLogger(source: string) {
  const log = (level: LogLevel, message: string, data?: unknown) => {
    const safe = data instanceof Error
      ? { name: data.name, code: (data as { code?: unknown }).code ?? null }
      : data === undefined ? undefined : sanitizeLogData(data)

    // Konsole: ebenfalls nur bereinigte Daten
    const prefix = `[${level.toUpperCase()}][${source}]`
    if (level === 'error')     console.error(prefix, message, safe ?? '')
    else if (level === 'warn') console.warn(prefix,  message, safe ?? '')
    else if (isDev)            console.log(prefix,   message, safe ?? '')

    // In DB schreiben (fire-and-forget)
    const entry = {
      level, source, message,
      ...(data instanceof Error
        ? { metadata: safe as Record<string, unknown>, error_detail: data.message.slice(0, MAX_STRING), stack_trace: data.stack?.slice(0, 2000) }
        : safe && typeof safe === 'object' ? { metadata: safe as Record<string, unknown> } : {}
      ),
    }
    persist(entry).catch(() => {}) // Logging darf nie die App crashen
  }

  return {
    debug: (msg: string, data?: unknown) => log('debug', msg, data),
    info:  (msg: string, data?: unknown) => log('info',  msg, data),
    warn:  (msg: string, data?: unknown) => log('warn',  msg, data),
    error: (msg: string, data?: unknown) => log('error', msg, data),
  }
}
