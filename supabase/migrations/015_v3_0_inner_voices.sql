-- Feature: "Innere Stimmen" — systemische Teile-Arbeit als eigenständiges Modul.
-- Siehe konzept-innere-stimmen-v1.md, Teil 3.

create table if not exists inner_voices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  status text not null default 'candidate' check (status in ('candidate', 'named', 'dismissed')),
  name text,                          -- vom Nutzer vergeben, null solange 'candidate'
  suggested_names jsonb default '[]', -- KI-Vorschläge, z.B. ["Der Antreiber", "Die Kontrolleurin"]
  description text,                   -- 1-2 Sätze, destilliert aus den verknüpften Einträgen

  introduced_at timestamptz,          -- wann Phase 1 (Verstehen) im Chat stattfand
  named_at timestamptz,               -- wann Phase 2 (Entscheidung) abgeschlossen wurde
  dismissed_at timestamptz,           -- falls Nutzer "passt nicht für mich" wählt

  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()  -- letzter Bezug in einem Gespräch
);

alter table inner_voices enable row level security;

create policy "Users manage their own inner voices"
  on inner_voices for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant all on inner_voices to service_role;
grant select, insert, update, delete on inner_voices to authenticated;

-- Verknüpfung zu bestehenden Tabellen — additiv, nullable, keine Abfrage bricht.
alter table coach_file_entries
  add column if not exists voice_id uuid references inner_voices(id) on delete set null;

alter table pattern_references
  add column if not exists voice_id uuid references inner_voices(id) on delete set null;
