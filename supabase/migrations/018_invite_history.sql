-- Ergänzt Nachverfolgung für admin-verschickte E-Mail-Einladungen
-- (siehe feature-admin-email-invite-v1.md). Rein additiv, keine
-- GRANT-Ergänzung nötig — 014_v2_9b_grants.sql deckt via
-- ALTER DEFAULT PRIVILEGES auch neue Spalten auf profiles ab.

alter table profiles
  add column if not exists invited_at timestamptz,
  add column if not exists invited_by uuid references auth.users(id);
