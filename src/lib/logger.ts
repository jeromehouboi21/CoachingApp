// src/lib/logger.ts
// Frontend-Logger: console in dev, Supabase error_logs in prod

import { supabase } from './supabase'

type LogLevel = 'info' | 'warn' | 'error'

const isDev = import.meta.env.DEV

async function persist(level: LogLevel, message: string, metadata?: Record<string, unknown>, userId?: string) {
  try {
    await supabase.from('error_logs').insert({
      function_name: 'frontend',
      level,
      message,
      metadata: metadata ?? null,
      user_id: userId ?? null,
    })
  } catch {
    // Logging darf nie die App crashen
  }
}

export function createFrontendLogger(context: string, userId?: string) {
  return {
    log(msg: string, data?: Record<string, unknown>) {
      if (isDev) console.log(`[${context}]`, msg, data ?? '')
    },
    warn(msg: string, data?: Record<string, unknown>) {
      if (isDev) console.warn(`[${context}]`, msg, data ?? '')
      else persist('warn', `[${context}] ${msg}`, data, userId)
    },
    error(msg: string, data?: Record<string, unknown>) {
      console.error(`[${context}]`, msg, data ?? '')
      if (!isDev) persist('error', `[${context}] ${msg}`, data, userId)
    },
  }
}
