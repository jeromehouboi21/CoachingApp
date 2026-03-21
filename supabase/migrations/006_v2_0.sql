-- Migration 006_v2_0.sql
-- "Verstehen"-Modul: pattern_references Tabelle
-- Verknüpft vom Coach erkannte Muster mit auslösenden Gesprächsmomenten

CREATE TABLE pattern_references (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  pattern_key     TEXT NOT NULL,        -- z.B. "rueckzug_unter_druck"
  pattern_label   TEXT NOT NULL,        -- z.B. "Rückzug unter Druck"
  message_id      UUID REFERENCES messages(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  excerpt         TEXT,                 -- Relevanter Gesprächsausschnitt (max. 150 Zeichen)
  detected_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pattern_refs_user_id    ON pattern_references (user_id);
CREATE INDEX idx_pattern_refs_pattern    ON pattern_references (pattern_key);
CREATE INDEX idx_pattern_refs_detected   ON pattern_references (detected_at DESC);

ALTER TABLE pattern_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their pattern references" ON pattern_references
  FOR ALL USING (auth.uid() = user_id);
