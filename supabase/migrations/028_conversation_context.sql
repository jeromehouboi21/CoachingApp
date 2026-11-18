-- 028: Serverseitiger Gesprächskontext (Security S-12)
--
-- Hintergrund: Das Frontend hat bisher die Ergebnisse der RAG-Suche (anonyme
-- Erfahrungen aus experience_patterns, also aus Gesprächen ANDERER Nutzer) über die
-- Function rag-search erhalten und bei jeder Nachricht an chat zurückgeschickt.
-- Neu: chat sucht beim ersten Nutzer-Input selbst und legt das Ergebnis hier ab.
-- Der Client hat auf diese Tabelle keinerlei Rechte; nur service_role (chat) liest
-- und schreibt.

create table if not exists public.conversation_context (
  conversation_id uuid primary key references public.conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  rag_context     jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  constraint conversation_context_rag_size check (pg_column_size(rag_context) <= 16384)
);

create index if not exists conversation_context_user_id_idx
  on public.conversation_context (user_id);

alter table public.conversation_context enable row level security;

-- Keine Policies für authenticated/anon → kein Client-Zugriff.
revoke all on public.conversation_context from public, anon, authenticated;
grant all on public.conversation_context to service_role;
