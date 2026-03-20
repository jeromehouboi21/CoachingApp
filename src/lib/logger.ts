// src/lib/logger.ts
// Frontend-Logger: console in dev, Supabase app_logs in prod

import { supabase } from './supabase'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

// Globale User-ID — wird in useAuth nach dem Login gesetzt
let currentUserId: string | null = null
export function setLoggerUserId(id: string | null) {
  currentUserId = id
}

const isDev = import.meta.env.DEV

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

  if (error && isDev) {
    console.warn('[logger] Failed to persist to app_logs:', error.message)
  }
}

export function createLogger(source: string) {
  const log = (level: LogLevel, message: string, data?: unknown) => {
    // Immer in Konsole
    const prefix = `[${level.toUpperCase()}][${source}]`
    if (level === 'error')     console.error(prefix, message, data ?? '')
    else if (level === 'warn') console.warn(prefix,  message, data ?? '')
    else if (isDev)            console.log(prefix,   message, data ?? '')

    // In DB schreiben (fire-and-forget)
    const entry = {
      level, source, message,
      ...(data instanceof Error
        ? { error_detail: data.message, stack_trace: data.stack }
        : data && typeof data === 'object' ? { metadata: data as Record<string, unknown> } : {}
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
