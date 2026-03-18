-- ================================================
-- Migration 003: Lernende Architektur (V1.4)
-- ================================================

-- pgvector Extension (einmalig aktivieren)
CREATE EXTENSION IF NOT EXISTS vector;

-- Anonymisierte Gesprächsmuster für semantische Ähnlichkeitssuche
-- Kein Personenbezug — nur Muster, Kontext und Coach-Wirksamkeit
CREATE TABLE experience_patterns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  embedding     vector(1536),             -- Vektorrepräsentation (OpenAI text-embedding-3-small)
  context       TEXT NOT NULL,            -- Themenfeld: "beruflicher Konflikt", "Beziehung", etc.
  pattern       TEXT NOT NULL,            -- Erkanntes Muster (anonym): "Rückzug bei Kritik"
  resistance    TEXT,                     -- Widerstandsmoment im Gespräch (falls aufgetreten)
  what_helped   TEXT,                     -- Welche Coach-Reaktion war wirksam
  what_blocked  TEXT,                     -- Was hat den Nutzer blockiert oder nicht geholfen
  outcome       TEXT CHECK (outcome IN ('breakthrough', 'stuck', 'partial', 'unknown')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index für schnelle Vektorsuche (IVFFlat)
CREATE INDEX ON experience_patterns USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- SQL-Funktion für semantische Ähnlichkeitssuche
CREATE OR REPLACE FUNCTION match_experiences(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.78,
  match_count     int DEFAULT 3
)
RETURNS TABLE(
  context      text,
  pattern      text,
  what_helped  text,
  resistance   text,
  similarity   float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    context,
    pattern,
    what_helped,
    resistance,
    1 - (embedding <=> query_embedding) AS similarity
  FROM experience_patterns
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- Selbstreflexion des Coaches nach jedem Gespräch
CREATE TABLE coach_reflections (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id       UUID REFERENCES conversations(id) ON DELETE SET NULL,
  was_helpful           BOOLEAN,
  what_worked           TEXT,            -- "Die Frage nach der Ausnahme hat den Wendepunkt erzeugt"
  what_missed           TEXT,            -- "Zu früh auf Lösungen gedrängtt"
  resistance_detected   BOOLEAN DEFAULT FALSE,
  resistance_handled    TEXT,            -- Wie wurde mit Widerstand umgegangen
  improvement_note      TEXT,            -- Konkreter Hinweis für zukünftige Gespräche
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Nutzerfeedback (aktiv gesammelt, mit Einwilligung)
CREATE TABLE user_feedback (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  feedback_type   TEXT CHECK (feedback_type IN ('improvement', 'praise', 'bug', 'general')),
  content         TEXT NOT NULL,
  context         TEXT,
  consent_given   BOOLEAN DEFAULT TRUE,
  processed       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Wöchentliches Supervision-Protokoll (automatisch generiert via pg_cron)
CREATE TABLE supervision_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start        DATE NOT NULL,
  total_conversations INTEGER DEFAULT 0,
  resistance_rate   NUMERIC(4,2),
  breakthrough_rate NUMERIC(4,2),
  top_patterns      JSONB,
  top_blockers      JSONB,
  improvement_recs  TEXT,               -- Fließt nächste Woche in buildSystemPrompt ein
  raw_reflections   JSONB,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE experience_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_reflections   ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervision_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback       ENABLE ROW LEVEL SECURITY;

-- experience_patterns, coach_reflections, supervision_logs:
-- Nur serverseitig via Service Role Key les- und schreibbar (kein Client-Zugriff)
-- Kein öffentliches SELECT-Policy → vollständig gesperrt für Nutzer

-- Nutzer können eigenes Feedback lesen
CREATE POLICY "Users read own feedback" ON user_feedback
  FOR SELECT USING (auth.uid() = user_id);

-- Nutzer können eigenes Feedback einfügen (consent_given wird vom Coach gesetzt)
CREATE POLICY "Users insert own feedback" ON user_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);
