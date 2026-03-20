-- Migration 005_v1_8.sql
-- Logging-Architektur: error_logs → app_logs
-- Alle Level (debug/info/warn/error), strukturierte Felder, RLS ohne SELECT

DROP TABLE IF EXISTS error_logs;

CREATE TABLE app_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Klassifikation
  level         TEXT        NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  source        TEXT        NOT NULL,
  -- Mögliche Werte: 'frontend' | 'chat' | 'rag-search' |
  --                 'post-conversation' | 'supervision' |
  --                 'useChat' | 'useAuth' | 'useMemory' | 'useStreak'

  -- Was ist passiert
  message       TEXT        NOT NULL,

  -- Korrelation: zusammengehörige Einträge finden
  request_id    TEXT,
  -- gleiche ID in Frontend + Edge Function eines API-Calls
  user_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- null erlaubt für Logs vor dem Login (z.B. Auth-Fehler)

  -- Zusatzdaten (flexibel)
  metadata      JSONB,

  -- Nur bei warn/error
  error_detail  TEXT,
  stack_trace   TEXT
);

-- Indizes für häufige Abfragen
CREATE INDEX idx_app_logs_level      ON app_logs (level);
CREATE INDEX idx_app_logs_source     ON app_logs (source);
CREATE INDEX idx_app_logs_created_at ON app_logs (created_at DESC);
CREATE INDEX idx_app_logs_user_id    ON app_logs (user_id);
CREATE INDEX idx_app_logs_request_id ON app_logs (request_id);

ALTER TABLE app_logs ENABLE ROW LEVEL SECURITY;

-- Frontend (eingeloggter User) darf eigene Logs schreiben
-- user_id IS NULL erlaubt Logs vor dem Login (z.B. Auth-Fehler)
CREATE POLICY "Users can insert own logs"
  ON app_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Keine SELECT-Policy → nur service_role kann lesen (Supabase Dashboard / Admin)
