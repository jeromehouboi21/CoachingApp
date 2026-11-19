-- 031: Nur der Server schreibt Nachrichten (S-12, Paket B Welle 2b).
--
-- Voraussetzung: Frontend mit neuem Format ist live (Welle 2a, 19.11.2026). Vorgezogen statt
-- nach 48 h: Aktivitätsprüfung vom 19.11.2026 zeigte keine echten Nutzer seit 02.09.2026, und
-- alle 12 legacy_format-Aufrufe stammten aus dem Angriffstest.
-- Policy-Name aus dem Audit Paket B (C1): messages_insert_own.

drop policy if exists messages_insert_own on public.messages;
revoke insert, update, delete on public.messages from authenticated;
revoke all on public.messages from anon;
-- Lesen bleibt (messages_select_own, Grant SELECT aus Migration 025).
