-- Krisenprotokoll für suizidale Themen im Coach-Gespräch.
-- Siehe konzept-krisenprotokoll-suizidalitaet-v1_1.md.

alter table messages add column if not exists message_type text
  default 'standard' check (message_type in ('standard', 'crisis_response'));

create table if not exists crisis_events (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  conversation_id   uuid references conversations(id) on delete set null,
  message_id        uuid references messages(id) on delete set null,
  detected_at       timestamptz not null default now(),
  confidence        text not null check (confidence in ('low','medium','high')),
  excerpt           text,              -- anonymisierter Ausschnitt, KEIN Volltext-Log
  response_shown    boolean not null default true,  -- Pflichttext wurde ausgegeben
  user_acknowledged boolean default null,            -- optional: hat Nutzer geantwortet
  reviewed_by_jerome boolean not null default false,
  reviewed_at       timestamptz,
  notes             text               -- interne Notizen, nie dem Nutzer sichtbar
);

alter table crisis_events enable row level security;

-- Nutzer sehen NICHT ihre eigenen Krisen-Einträge (kein UI dafür) —
-- nur service_role (Edge Function) darf schreiben, nur Jerome liest.
create policy "service_role only"
  on crisis_events for all
  using (false)
  with check (false);

grant all on crisis_events to service_role;
