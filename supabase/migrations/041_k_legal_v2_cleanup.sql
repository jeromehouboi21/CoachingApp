-- 041: Paket K – Rechtstexte v2.0 (legaltexte-abgleich.md, E1/E2, CODE-3/CODE-7)
--
-- E1: Bisherige Coach-Reflexionen entstanden ohne Anonymitätsregel. Sie werden gelöscht; die
--     Supervision beginnt mit neuen, geprüften Notizen (post-conversation, Prüfschritt CODE-3).
--     supervision_logs bleiben (allgemeine Empfehlungen, Supervision-Prompt verbietet Einzelfälle).
-- E2: Lernbasis-Zustimmungen mit dem alten Text (Version 1.0) werden zurückgesetzt, ihre Einträge
--     gelöscht. Neue Zustimmung nur mit dem Text v2.0 (LEARNING_OPT_IN in src/content/legalTexts.js).
--     set_learning_opt_in nimmt deshalb nur noch Version '2.0' an.
--
-- Rückgängig machen: Gelöschte Reflexionen und Lernbasis-Einträge lassen sich nur aus dem Backup
--   zurückholen. set_learning_opt_in in der Fassung aus 037 neu anlegen.
--
-- Vorher zählen (nur Zähler):
--   select count(*) from public.coach_reflections;
--   select count(*) filter (where learning_opt_in) as zustimmungen,
--          (select count(*) from public.experience_patterns) as eintraege from public.profiles;

-- ── E1 ───────────────────────────────────────────────────────────────────────
delete from public.coach_reflections;

-- ── E2 ───────────────────────────────────────────────────────────────────────
delete from public.experience_patterns
 where source_user_id in (
   select id from public.profiles
    where learning_opt_in and coalesce(learning_opt_in_version, '') <> '2.0');

update public.profiles
   set learning_opt_in = false,
       learning_opt_in_updated_at = now()
 where learning_opt_in and coalesce(learning_opt_in_version, '') <> '2.0';

-- Fassung aus 037, Zustimmung nur noch mit Version 2.0
create or replace function public.set_learning_opt_in(p_opt_in boolean, p_version text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_deleted integer := 0;
begin
  if not public.mfa_satisfied() then
    raise exception 'mfa_required' using errcode = '42501';
  end if;
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_opt_in is null then
    raise exception 'invalid_opt_in' using errcode = '22023';
  end if;
  if p_opt_in and coalesce(p_version, '') <> '2.0' then
    raise exception 'invalid_version' using errcode = '22023';
  end if;

  update public.profiles
     set learning_opt_in            = p_opt_in,
         learning_opt_in_updated_at = now(),
         learning_opt_in_version    = case when p_opt_in then p_version else learning_opt_in_version end
   where id = v_uid;

  if not p_opt_in then
    delete from public.experience_patterns where source_user_id = v_uid;
    get diagnostics v_deleted = row_count;
  end if;

  return jsonb_build_object('opt_in', p_opt_in, 'deleted', v_deleted);
end;
$$;
revoke all on function public.set_learning_opt_in(boolean, text) from public, anon;
grant execute on function public.set_learning_opt_in(boolean, text) to authenticated;
