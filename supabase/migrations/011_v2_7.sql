-- v2.7: DSGVO-Consent-Felder in profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS consent_given_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS consent_ip TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS consent_version TEXT DEFAULT NULL;

COMMENT ON COLUMN profiles.consent_given_at IS 'Zeitstempel der Einwilligung gemäß Art. 7 DSGVO';
COMMENT ON COLUMN profiles.consent_ip IS 'IP-Adresse zum Zeitpunkt der Einwilligung (Nachweis)';
COMMENT ON COLUMN profiles.consent_version IS 'Version der Datenschutzerklärung zum Zeitpunkt der Einwilligung';
