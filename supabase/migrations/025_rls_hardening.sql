-- 025: RLS-Härtung nach Least Privilege (Security-Paket A, S-02)
--
-- Grundsatz: Der Client (Rolle authenticated) bekommt genau die Rechte, die das
-- Frontend nachweislich nutzt (docs/security/paket-a-discovery.md, Abschn. 2.2).
-- Policies nur noch für "authenticated", nie für public/anon. anon hat keine
-- Tabellenrechte mehr. service_role (Edge Functions) bleibt unberührt (BYPASSRLS +
-- GRANT ALL aus 014).
--
-- Policy-Namen der DROP-Anweisungen stammen aus dem Live-Audit vom 18.11.2026
-- (inkl. per Dashboard angelegter "Service role full access"-Policies).
-- app_logs wird separat in 026 behandelt.

-- ── 0. RLS sicher an (laut Audit überall bereits aktiv) ──────────────────────
alter table public.profiles            enable row level security;
alter table public.conversations       enable row level security;
alter table public.messages            enable row level security;
alter table public.user_memory         enable row level security;
alter table public.insights            enable row level security;
alter table public.inner_voices        enable row level security;
alter table public.coach_file_entries  enable row level security;
alter table public.coachee_profile     enable row level security;
alter table public.session_notes       enable row level security;
alter table public.pattern_references  enable row level security;
alter table public.resonance_map       enable row level security;
alter table public.user_feedback       enable row level security;
alter table public.feedback_surveys    enable row level security;
alter table public.experience_patterns enable row level security;
alter table public.coach_reflections   enable row level security;
alter table public.supervision_logs    enable row level security;
alter table public.invite_codes        enable row level security;
alter table public.crisis_events       enable row level security;

-- ── 1. Alte Policies entfernen ──────────────────────────────────────────────
drop policy if exists "Users own their profile"             on public.profiles;
drop policy if exists "Users own their conversations"       on public.conversations;
drop policy if exists "Users own their messages"            on public.messages;
drop policy if exists "Users own their memory"              on public.user_memory;
drop policy if exists "Users own their insights"            on public.insights;
drop policy if exists "Service role full access"            on public.insights;
drop policy if exists "Users manage their own inner voices" on public.inner_voices;
drop policy if exists "Users own their coach file"          on public.coach_file_entries;
drop policy if exists "Service role full access"            on public.coach_file_entries;
drop policy if exists "Users own their coachee profile"     on public.coachee_profile;
drop policy if exists "Service role full access"            on public.coachee_profile;
drop policy if exists "Users own their session notes"       on public.session_notes;
drop policy if exists "Service role full access"            on public.session_notes;
drop policy if exists "Users own their pattern references"  on public.pattern_references;
drop policy if exists "Service role full access"            on public.pattern_references;
drop policy if exists "Users own their resonance map"       on public.resonance_map;
drop policy if exists "Users insert own feedback"           on public.user_feedback;
drop policy if exists "Users read own feedback"             on public.user_feedback;
drop policy if exists "Users insert own survey"             on public.feedback_surveys;
drop policy if exists "Users read own survey"               on public.feedback_surveys;
drop policy if exists "Service role full access"            on public.experience_patterns;
drop policy if exists "Service role full access"            on public.coach_reflections;
-- crisis_events behält "service_role only" (USING false / WITH CHECK false)

-- ── 2. Tabellenrechte zurücksetzen ──────────────────────────────────────────
-- anon: gar nichts (Frontend liest ohne Login nichts, siehe Discovery 2.2)
revoke all on all tables in schema public from anon;
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;

-- authenticated: erst alles entziehen (inkl. TRUNCATE/TRIGGER/REFERENCES, die RLS umgehen
-- bzw. nicht gebraucht werden), dann gezielt vergeben
revoke all on all tables in schema public from authenticated;

grant select, update                 on public.profiles           to authenticated;
grant select, insert, update         on public.conversations      to authenticated;
grant select, insert                 on public.messages           to authenticated;
grant select, insert, update         on public.user_memory        to authenticated;  -- useMemory: upsert
grant select, insert, update, delete on public.insights           to authenticated;
grant select, update                 on public.inner_voices       to authenticated;
grant select                         on public.coach_file_entries to authenticated;
grant select                         on public.coachee_profile    to authenticated;  -- Spiegel
grant select                         on public.session_notes      to authenticated;  -- Spiegel + Verlauf
grant select                         on public.pattern_references to authenticated;
grant insert                         on public.user_feedback      to authenticated;
grant insert                         on public.feedback_surveys   to authenticated;
-- app_logs: siehe 026
-- Keine Rechte: resonance_map, experience_patterns, coach_reflections, supervision_logs,
--               invite_codes, crisis_events, View feedback_survey_scores

-- ── 3. Soll-Policies (nur authenticated) ────────────────────────────────────
-- profiles
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- conversations
create policy conversations_select_own on public.conversations
  for select to authenticated using (user_id = (select auth.uid()));
create policy conversations_insert_own on public.conversations
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy conversations_update_own on public.conversations
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- messages (Eigentum über die Konversation)
create policy messages_select_own on public.messages
  for select to authenticated
  using (conversation_id in (select c.id from public.conversations c where c.user_id = (select auth.uid())));
create policy messages_insert_own on public.messages
  for insert to authenticated
  with check (conversation_id in (select c.id from public.conversations c where c.user_id = (select auth.uid())));

-- user_memory
create policy user_memory_select_own on public.user_memory
  for select to authenticated using (user_id = (select auth.uid()));
create policy user_memory_insert_own on public.user_memory
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy user_memory_update_own on public.user_memory
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- insights (conversation_id darf nur auf eigene Konversationen zeigen)
create policy insights_select_own on public.insights
  for select to authenticated using (user_id = (select auth.uid()));
create policy insights_insert_own on public.insights
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (conversation_id is null
         or conversation_id in (select c.id from public.conversations c where c.user_id = (select auth.uid())))
  );
create policy insights_update_own on public.insights
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy insights_delete_own on public.insights
  for delete to authenticated using (user_id = (select auth.uid()));

-- inner_voices
create policy inner_voices_select_own on public.inner_voices
  for select to authenticated using (user_id = (select auth.uid()));
create policy inner_voices_update_own on public.inner_voices
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- nur lesen (Writes ausschließlich durch Edge Functions)
create policy coach_file_entries_select_own on public.coach_file_entries
  for select to authenticated using (user_id = (select auth.uid()));
create policy coachee_profile_select_own on public.coachee_profile
  for select to authenticated using (user_id = (select auth.uid()));
create policy session_notes_select_own on public.session_notes
  for select to authenticated using (user_id = (select auth.uid()));
create policy pattern_references_select_own on public.pattern_references
  for select to authenticated using (user_id = (select auth.uid()));

-- nur einfügen
create policy user_feedback_insert_own on public.user_feedback
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy feedback_surveys_insert_own on public.feedback_surveys
  for insert to authenticated with check (user_id = (select auth.uid()));

-- ── 4. View feedback_survey_scores: RLS des Aufrufers erzwingen, Client-Zugriff weg ─
alter view public.feedback_survey_scores set (security_invoker = true);
revoke all on public.feedback_survey_scores from anon, authenticated;
grant select on public.feedback_survey_scores to service_role;

-- ── 5. Funktionen: fester search_path, Ausführungsrechte minimal ─────────────
-- 5a. redeem_invite_code: nur noch service_role (validate-invite-code). Neu mit
--     schema-qualifizierten Namen und search_path = ''.
create or replace function public.redeem_invite_code(p_code text, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code_id   uuid;
  v_max_uses  integer;
  v_uses      integer;
  v_expires   timestamptz;
begin
  select id, max_uses, uses_count, expires_at
  into v_code_id, v_max_uses, v_uses, v_expires
  from public.invite_codes
  where code = upper(p_code)
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;

  if v_expires is not null and v_expires < now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  if v_max_uses is not null and v_uses >= v_max_uses then
    return jsonb_build_object('ok', false, 'error', 'used_up');
  end if;

  update public.invite_codes set uses_count = uses_count + 1 where id = v_code_id;
  update public.profiles set plan = 'tester' where id = p_user_id;

  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.redeem_invite_code(text, uuid) from public, anon, authenticated;
grant execute on function public.redeem_invite_code(text, uuid) to service_role;

-- 5b. handle_new_user (Auth-Trigger, Body ist bereits schema-qualifiziert)
alter function public.handle_new_user() set search_path = '';
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- 5c. match_experiences: nur service_role (rag-search). Der <=>-Operator kommt aus
--     pgvector im Schema public → search_path fest auf public.
alter function public.match_experiences(vector, double precision, integer) set search_path = public;
revoke all on function public.match_experiences(vector, double precision, integer) from public, anon, authenticated;
grant execute on function public.match_experiences(vector, double precision, integer) to service_role;

-- 5d. touch_conversation_updated_at (Trigger auf messages) – schema-qualifiziert
create or replace function public.touch_conversation_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$;
revoke all on function public.touch_conversation_updated_at() from public, anon, authenticated;

-- 5e. get_conversation_history (Verlaufs-Screen, SECURITY INVOKER) – schema-qualifiziert
create or replace function public.get_conversation_history()
returns table (
  id                 uuid,
  created_at         timestamptz,
  updated_at         timestamptz,
  message_count      bigint,
  main_topic         text,
  first_user_message text,
  key_insight        text
)
language sql
stable
set search_path = ''
as $$
  select
    c.id,
    c.created_at,
    c.updated_at,
    count(m.id) as message_count,
    sn.main_topic,
    (
      select fm.content from public.messages fm
      where fm.conversation_id = c.id and fm.role = 'user'
      order by fm.created_at asc limit 1
    ) as first_user_message,
    c.key_insight
  from public.conversations c
  join public.messages m on m.conversation_id = c.id
  left join public.session_notes sn on sn.conversation_id = c.id
  where c.user_id = auth.uid()
  group by c.id, sn.main_topic
  having count(m.id) filter (where m.role = 'user') >= 1
  order by c.updated_at desc;
$$;
revoke all on function public.get_conversation_history() from public, anon;
grant execute on function public.get_conversation_history() to authenticated;

-- 5f. Schutz-Trigger-Funktionen aus 023/024 und consume_session: Rechte bereits dort gesetzt.

-- ── 6. Realtime ─────────────────────────────────────────────────────────────
-- Laut Audit F ist die Publikation supabase_realtime leer; das Frontend nutzt kein Realtime.
-- Nichts zu tun.
