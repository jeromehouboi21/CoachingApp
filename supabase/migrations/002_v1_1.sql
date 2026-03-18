-- V1.1 Migration: Coach-Gedächtnis, Erkenntnisse, erweiterte Gespräche

-- messages: Eingabe-Modus tracken
ALTER TABLE messages ADD COLUMN IF NOT EXISTS input_mode TEXT DEFAULT 'text' CHECK (input_mode IN ('text', 'voice'));

-- conversations: Zusammenfassung + Erkenntnis + Gedächtnis-Flag
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS key_insight TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS memory_updated BOOLEAN DEFAULT FALSE;

-- Coach-Gedächtnis: Was der Coach über den Coachee weiß
CREATE TABLE IF NOT EXISTS user_memory (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  themes        JSONB DEFAULT '[]',
  patterns      JSONB DEFAULT '[]',
  strengths     JSONB DEFAULT '[]',
  context       JSONB DEFAULT '{}',
  last_updated  TIMESTAMPTZ DEFAULT NOW()
);

-- Erkenntnisse ("Mein Spiegel")
CREATE TABLE IF NOT EXISTS insights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  content         TEXT NOT NULL,
  category        TEXT DEFAULT 'erkenntnis' CHECK (category IN ('muster', 'stärke', 'erkenntnis', 'ziel')),
  source          TEXT DEFAULT 'auto' CHECK (source IN ('auto', 'user')),
  is_pinned       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE user_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their memory" ON user_memory
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own their insights" ON insights
  FOR ALL USING (auth.uid() = user_id);
