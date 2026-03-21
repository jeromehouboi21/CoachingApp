-- 008_v2_2.sql
-- Stufe 2: Lebendige Coach-Akte (Ideen 01, 02, 07)
-- Neue Tabellen: coach_file_entries, coachee_profile, session_notes

-- IDEE 01: Strukturierte Coach-Akte (ergänzt user_memory)
-- Jeder Eintrag ist eine datierte, nachverfolgbare Beobachtung.
CREATE TABLE IF NOT EXISTS coach_file_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category        TEXT NOT NULL CHECK (category IN (
                    'pattern', 'strength', 'theme', 'value', 'trigger'
                  )),
  label           TEXT NOT NULL,
  description     TEXT,
  example         TEXT,
  source_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  first_detected  TIMESTAMPTZ DEFAULT NOW(),
  history         JSONB DEFAULT '[]',
  confidence      INTEGER DEFAULT 3 CHECK (confidence BETWEEN 1 AND 5),
  status          TEXT DEFAULT 'active' CHECK (status IN ('active', 'fading', 'resolved')),
  last_updated    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_file_user   ON coach_file_entries (user_id);
CREATE INDEX IF NOT EXISTS idx_coach_file_cat    ON coach_file_entries (user_id, category);
CREATE INDEX IF NOT EXISTS idx_coach_file_status ON coach_file_entries (user_id, status);

ALTER TABLE coach_file_entries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'coach_file_entries' AND policyname = 'Users own their coach file'
  ) THEN
    CREATE POLICY "Users own their coach file" ON coach_file_entries
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- IDEE 02: Strukturiertes Personenprofil
-- Wächst schleichend durch Coach-Extraktion — nie direkt abgefragt.
CREATE TABLE IF NOT EXISTS coachee_profile (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  occupation          TEXT,
  relationship_status TEXT,
  family_situation    TEXT,
  living_situation    TEXT,
  life_phase          TEXT,
  current_focus       TEXT,
  known_values        JSONB DEFAULT '[]',
  known_stressors     JSONB DEFAULT '[]',
  known_resources     JSONB DEFAULT '[]',
  completeness        INTEGER DEFAULT 0,
  last_enriched_by    UUID REFERENCES conversations(id) ON DELETE SET NULL,
  last_updated        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE coachee_profile ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'coachee_profile' AND policyname = 'Users own their coachee profile'
  ) THEN
    CREATE POLICY "Users own their coachee profile" ON coachee_profile
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- IDEE 07: Strukturierte Session-Notes
-- Ersetzt die freie Zusammenfassung in conversations.summary durch definierte Felder.
-- conversations.summary bleibt als Kurzversion für die Briefing-Function.
CREATE TABLE IF NOT EXISTS session_notes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id     UUID REFERENCES conversations(id) ON DELETE CASCADE UNIQUE,
  user_id             UUID REFERENCES profiles(id) ON DELETE CASCADE,
  main_topic          TEXT NOT NULL,
  emotional_intensity INTEGER CHECK (emotional_intensity BETWEEN 1 AND 5),
  resistance_detected BOOLEAN DEFAULT FALSE,
  resistance_location TEXT,
  breakthrough_moment TEXT,
  where_we_left_off   TEXT,
  coach_effectiveness INTEGER CHECK (coach_effectiveness BETWEEN 1 AND 5),
  next_session_rec    TEXT,
  file_updates        JSONB DEFAULT '[]',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_notes_user ON session_notes (user_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_conv ON session_notes (conversation_id);

ALTER TABLE session_notes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'session_notes' AND policyname = 'Users own their session notes'
  ) THEN
    CREATE POLICY "Users own their session notes" ON session_notes
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
