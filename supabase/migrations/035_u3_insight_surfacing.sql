-- 035: U3 Heute & Gesprächseinstieg (Zielbild 2026-11, UX-Konzept 8.1)
-- Damit Heute weiß, welche Erkenntnis es zeigt und welche schon aufgegriffen wurde.
-- Nur Zeitstempel an bestehenden Zeilen: RLS, GRANTs (Migration 025: update own für authenticated)
-- und Löschkette (insights → ON DELETE CASCADE) bleiben unverändert.
--
-- Rückgängig:
--   drop index if exists public.insights_user_created_idx;
--   alter table public.insights drop column if exists surfaced_at,
--     drop column if exists confirmed_at, drop column if exists dismissed_at;

alter table public.insights
  add column if not exists surfaced_at  timestamptz,  -- auf Heute angezeigt (Nachklang oder Wiederentdecken)
  add column if not exists confirmed_at timestamptz,  -- vom Nutzer bestätigt oder angepasst
  add column if not exists dismissed_at timestamptz;  -- „Heute nicht“

create index if not exists insights_user_created_idx on public.insights (user_id, created_at desc);
