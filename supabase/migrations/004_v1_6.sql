-- Migration 004_v1_6.sql
-- Logging-Architektur: error_logs Tabelle für Frontend- und Edge-Function-Fehler

CREATE TABLE IF NOT EXISTS error_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,         -- 'chat', 'post-conversation', 'frontend', etc.
  level       text NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  message     text NOT NULL,
  metadata    jsonb,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

-- Index für schnelle Fehlersuche nach Zeitstempel und Funktion
CREATE INDEX IF NOT EXISTS error_logs_created_at_idx ON error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS error_logs_function_idx   ON error_logs (function_name);
CREATE INDEX IF NOT EXISTS error_logs_level_idx      ON error_logs (level);

-- RLS: Nutzer können nur ihre eigenen Logs sehen; Service Role kann alles schreiben
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own error logs"
  ON error_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Frontend schreibt mit anon key → INSERT muss für authentifizierte Nutzer erlaubt sein
CREATE POLICY "Authenticated users can insert error logs"
  ON error_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Automatisches Aufräumen: Logs älter als 90 Tage löschen (via pg_cron falls aktiv)
-- SELECT cron.schedule('cleanup-error-logs', '0 3 * * *',
--   $$DELETE FROM error_logs WHERE created_at < now() - interval '90 days'$$);
