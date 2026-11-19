-- 033: Löschung vollständig + Aufbewahrungsfristen (S-15, Paket B Welle 4)
-- Grundlage: Audit Paket B (A: Fremdschlüssel, B: Spalten), Fristen nach D-4 (Lösungsdesign 4.5).
-- Voraussetzung: 031 und 032 sind eingespielt.

-- ── Teil A: Löschverhalten der Fremdschlüssel ───────────────────────────────

-- profiles.invited_by → auth.users war NO ACTION: Solange ein eingeladenes Konto existiert,
-- ließ sich das einladende Konto (Admin) nicht löschen. Die Einladung ist Historie → SET NULL.
alter table public.profiles drop constraint if exists profiles_invited_by_fkey;
alter table public.profiles
  add constraint profiles_invited_by_fkey foreign key (invited_by)
  references auth.users (id) on delete set null;

-- user_feedback.user_id → profiles war SET NULL: Feedback blieb nach einer Kontolöschung
-- ohne Zuordnung stehen (delete-account löscht es zwar explizit, die DB-Regel war aber offen).
alter table public.user_feedback drop constraint if exists user_feedback_user_id_fkey;
alter table public.user_feedback
  add constraint user_feedback_user_id_fkey foreign key (user_id)
  references public.profiles (id) on delete cascade;

-- coach_reflections.conversation_id → conversations war SET NULL, und die Tabelle hat keine
-- user_id: Nach einer Kontolöschung blieben die Reflexionen (Text über das Gespräch) verwaist.
-- Sie gehören zum Gespräch → CASCADE. Bereits verwaiste Zeilen (Audit D: 0) werden gelöscht.
delete from public.coach_reflections where conversation_id is null;
alter table public.coach_reflections drop constraint if exists coach_reflections_conversation_id_fkey;
alter table public.coach_reflections
  add constraint coach_reflections_conversation_id_fkey foreign key (conversation_id)
  references public.conversations (id) on delete cascade;

-- Bewusst unverändert (im Abschlussbericht begründet):
-- - app_logs.user_id SET NULL: Logs enthalten nur IDs/Codes/Zähler und werden nach 30 Tagen gelöscht.
-- - insights/pattern_references/coach_file_entries/coachee_profile/crisis_events: Verweise auf
--   Gespräche/Nachrichten/Stimmen SET NULL; die Zeilen selbst hängen per user_id CASCADE am Konto.

-- supervision_logs.raw_reflections: Volltext-Kopie der Reflexionen, wird nirgends gelesen und
-- überlebt die Löschung der Gespräche. Datenminimierung: nicht mehr speichern (supervision) und
-- Bestand leeren. Die Zähler und improvement_recs bleiben.
update public.supervision_logs set raw_reflections = null where raw_reflections is not null;

-- ── Teil B: Fristen (D-4) ───────────────────────────────────────────────────
create or replace function public.apply_retention()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r jsonb := '{}'::jsonb;
  n integer;
begin
  -- Krisen-Ausschnitt: nach Sichtung oder spätestens nach 90 Tagen leeren
  update public.crisis_events set excerpt = null
   where excerpt is not null
     and (reviewed_by_jerome = true or detected_at < now() - interval '90 days');
  get diagnostics n = row_count; r := r || jsonb_build_object('crisis_excerpt_cleared', n);

  -- Krisen-Ereignis: 3 Jahre ab Ende des Kalenderjahres (März 2026 → gelöscht Anfang 2030)
  delete from public.crisis_events
   where date_trunc('year', detected_at) + interval '4 years' <= now();
  get diagnostics n = row_count; r := r || jsonb_build_object('crisis_deleted', n);

  delete from public.coach_reflections where created_at < now() - interval '12 months';
  get diagnostics n = row_count; r := r || jsonb_build_object('reflections_deleted', n);

  delete from public.supervision_logs where created_at < now() - interval '24 months';
  get diagnostics n = row_count; r := r || jsonb_build_object('supervision_deleted', n);

  delete from public.user_feedback where created_at < now() - interval '24 months';
  get diagnostics n = row_count; r := r || jsonb_build_object('feedback_deleted', n);

  insert into public.app_logs (level, source, message, metadata)
  values ('info', 'retention', 'retention_applied', r);
  return r;
end;
$$;

revoke all on function public.apply_retention() from public, anon, authenticated;

select cron.unschedule('apply-retention')
where exists (select 1 from cron.job where jobname = 'apply-retention');
select cron.schedule('apply-retention', '41 3 * * *', $$ select public.apply_retention() $$);

-- Inaktive Konten: in Paket B nur Bericht (Löschung erst mit Mailkanal für den Hinweis, S-22)
create or replace function public.inactive_accounts_report(p_months integer default 24)
returns table (user_id uuid, last_sign_in_at timestamptz, created_at timestamptz)
language sql
security definer
set search_path = ''
as $$
  select u.id, u.last_sign_in_at, u.created_at
  from auth.users u
  where coalesce(u.last_sign_in_at, u.created_at) < now() - make_interval(months => p_months)
  order by 2 nulls first;
$$;

revoke all on function public.inactive_accounts_report(integer) from public, anon, authenticated;
grant execute on function public.inactive_accounts_report(integer) to service_role;
