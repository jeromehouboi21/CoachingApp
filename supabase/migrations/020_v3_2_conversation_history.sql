-- Gesprächsverlauf & Fortsetzen-Funktion (v3.2)

-- 1) conversations.updated_at bei jeder neuen Nachricht aktualisieren.
--    Ohne diesen Trigger bleibt updated_at auf dem Erstellungszeitpunkt stehen
--    und der Verlauf lässt sich nicht sinnvoll nach "zuletzt aktiv" sortieren.
--    Kein SECURITY DEFINER nötig: Der Nutzer besitzt die Conversation bereits
--    (RLS-Policy "Users own their conversations" erlaubt das UPDATE über
--    auth.uid() = user_id), keine Rechteausweitung erforderlich.
CREATE OR REPLACE FUNCTION touch_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET updated_at = NOW() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_conversation_updated_at ON messages;
CREATE TRIGGER trg_touch_conversation_updated_at
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION touch_conversation_updated_at();

-- 2) Index für die Verlaufsabfrage (sortiert nach updated_at, filtert nach user_id)
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated
  ON conversations (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON messages (conversation_id, created_at ASC);

-- 3) RPC-Funktion für die Verlaufsliste.
--    SECURITY INVOKER (Standard) — läuft mit den Rechten des aufrufenden Nutzers,
--    RLS auf conversations/messages/session_notes greift also weiterhin.
--    Der WHERE-Filter auf auth.uid() ist zusätzliche Absicherung, keine Ersetzung der RLS.
--    Grund für eine DB-Funktion statt Client-seitigem Join: vermeidet N+1-Queries
--    (eine Abfrage pro Conversation für message_count) bei wachsendem Verlauf.
CREATE OR REPLACE FUNCTION get_conversation_history()
RETURNS TABLE (
  id                 UUID,
  created_at         TIMESTAMPTZ,
  updated_at         TIMESTAMPTZ,
  message_count      BIGINT,
  main_topic         TEXT,
  first_user_message TEXT,
  key_insight        TEXT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    c.id,
    c.created_at,
    c.updated_at,
    COUNT(m.id) AS message_count,
    sn.main_topic,
    (
      SELECT content FROM messages
      WHERE conversation_id = c.id AND role = 'user'
      ORDER BY created_at ASC LIMIT 1
    ) AS first_user_message,
    c.key_insight
  FROM conversations c
  JOIN messages m ON m.conversation_id = c.id
  LEFT JOIN session_notes sn ON sn.conversation_id = c.id
  WHERE c.user_id = auth.uid()
  GROUP BY c.id, sn.main_topic
  HAVING COUNT(m.id) FILTER (WHERE m.role = 'user') >= 1
  ORDER BY c.updated_at DESC;
$$;

-- WICHTIG (siehe Design-Doc, Abschnitt "Silent Failures"): Ohne dieses GRANT
-- schlägt der RPC-Call über PostgREST mit einem Permission-Fehler fehl,
-- der clientseitig leicht übersehen wird, wenn der Fehler nicht geloggt wird.
GRANT EXECUTE ON FUNCTION get_conversation_history() TO authenticated;

COMMENT ON FUNCTION get_conversation_history() IS
  'Liefert die Gesprächsliste des eingeloggten Nutzers für den Verlaufs-Screen (v3.2). Nur Conversations mit mind. 1 User-Nachricht.';
