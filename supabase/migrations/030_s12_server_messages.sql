-- 030: Nachrichten werden serverseitig geschrieben (S-12, Paket B Welle 2a). Rein additiv.
--
-- client_message_id: UUID, die die App pro Nachricht erzeugt. Damit darf die App nach einem
-- Netzfehler gefahrlos erneut senden; der Server legt die Nachricht nur einmal an.
--
-- Abweichung vom Handoff: Der eindeutige Index ist NICHT partiell (kein "where … is not null").
-- PostgREST/supabase-js kann ON CONFLICT nur gegen einen vollständigen Index auflösen.
-- Alte Zeilen haben client_message_id = null; NULL-Werte gelten in Postgres als verschieden,
-- verletzen den Index also nicht.

alter table public.messages
  add column if not exists client_message_id uuid;

create unique index if not exists messages_conversation_client_msg_uidx
  on public.messages (conversation_id, client_message_id);

-- metadata existiert seit 001 (nullable, ohne Standardwert)
alter table public.messages
  alter column metadata set default '{}'::jsonb;
