-- v3.2: Verknüpfung zwischen einem Muster/Trigger in der Coach-Akte und dem
-- Wert/Glaubenssatz, den es zu schützen scheint (siehe FILE_UPDATE_PROMPT).
-- Rein additiv, nullable — keine bestehende Abfrage oder Anzeige bricht.

alter table coach_file_entries
  add column if not exists linked_value text;

comment on column coach_file_entries.linked_value is
  'Wert oder Glaubenssatz, den dieses Muster laut Coach-Einschätzung schützt (z.B. "Ich darf keine Fehler machen"). Wird von post-conversation befüllt, optional.';
