-- v2.9: Trigger-Zuverlässigkeit des Gedächtnisses (Abschnitt 6b.0)
-- Idempotenz-Schutz für post-conversation: ein Gespräch kann wachsen
-- (Nutzer kommt zurück, schreibt weiter) — die Pipeline darf dann erneut
-- laufen, aber nicht zweimal für denselben Nachrichtenstand.
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS post_processed_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS post_processed_message_count INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN conversations.post_processed_at IS 'Zeitstempel des letzten post-conversation Durchlaufs (v2.9)';
COMMENT ON COLUMN conversations.post_processed_message_count IS 'Nachrichtenanzahl beim letzten post-conversation Durchlauf — verhindert doppelte Verarbeitung desselben Standes';
