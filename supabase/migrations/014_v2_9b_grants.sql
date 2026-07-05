-- Behoben: "permission denied for table X" bei service_role-Writes.
-- Ursache: keine der bisherigen 13 Migrationen enthielt ein explizites
-- GRANT — alles hing an projektweiten Standard-Privilegien, die für
-- mehrere Tabellen (u.a. session_notes, app_logs) nicht griffen.

GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Damit künftige Migrationen (neue Tabellen) automatisch mitgezogen werden:
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
