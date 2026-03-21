-- Migration 007_v2_1.sql
-- Pre-Session-Briefing (Idee 03) + Offene Fäden (Idee 04)

-- Offener Faden: was wurde angesprochen aber nicht abgeschlossen?
-- Wird nach jedem Gespräch durch post-conversation extrahiert.
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS open_thread TEXT,
  ADD COLUMN IF NOT EXISTS open_thread_intensity
    TEXT CHECK (open_thread_intensity IN ('low', 'medium', 'high')) DEFAULT NULL;

-- Zeitstempel der letzten Wiederkehr-Begrüßung.
-- Verhindert, dass sie öfter als alle 5 Tage erscheint.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_return_greeting_at TIMESTAMPTZ DEFAULT NULL;
