-- v2.8: Coaching-Vereinbarung in profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS coaching_agreement_accepted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS coaching_agreement_version TEXT DEFAULT NULL;

COMMENT ON COLUMN profiles.coaching_agreement_accepted_at IS 'Zeitstempel der Coaching-Vereinbarung (v2.8)';
COMMENT ON COLUMN profiles.coaching_agreement_version IS 'Version der Coaching-Vereinbarung zum Zeitpunkt der Zustimmung';
