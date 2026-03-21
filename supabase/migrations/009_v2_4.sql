-- 009_v2_4.sql — Resonanzkarte (Idee 05)
-- Erfasst über Zeit, was bei diesem Menschen öffnet und was ihn schließt.
-- Wird nicht dem Nutzer angezeigt — fließt still in den System-Prompt.
-- Relevant ab dem 3. Gespräch.

CREATE TABLE IF NOT EXISTS resonance_map (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,

  -- Was hat Öffnung erzeugt?
  -- z.B. "Fragen nach Ausnahmen öffnen ihn sofort"
  opening_patterns  JSONB DEFAULT '[]',

  -- Was hat Schließen / Ausweichen ausgelöst?
  -- z.B. "Direkte Fragen zur Familie führen zu Einsilbigkeit"
  closing_patterns  JSONB DEFAULT '[]',

  -- Welche Frage-Typen funktionieren bei dieser Person?
  -- z.B. "Skalierungsfragen werden gut angenommen"
  effective_styles  JSONB DEFAULT '[]',

  -- Welche Metaphern / Bilder haben geklickt?
  -- z.B. "Bild des 'Rucksacks den andere gepackt haben'"
  resonant_metaphors JSONB DEFAULT '[]',

  -- Optimaler Gesprächs-Rhythmus dieser Person
  preferred_pace    TEXT CHECK (preferred_pace IN ('slow', 'medium', 'direct')) DEFAULT NULL,

  last_updated      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resonance_map_user ON resonance_map (user_id);

ALTER TABLE resonance_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their resonance map" ON resonance_map
  FOR ALL USING (auth.uid() = user_id);
