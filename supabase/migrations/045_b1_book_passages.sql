-- 045: B1 Buch-Bezüge – Tabelle book_passages, Spalten an conversations, RPC get_book_hints
-- (Handoff handoff-b1-buch-bezuege.md v1, J-B1 21.11.2026)
--
-- Inhalt:
--   1. public.book_passages: kuratierte, von Jerome freigegebene Buchstellen. Keine Nutzerdaten.
--      RLS an, keine Policies, nur service_role liest. Daten kommen per Seed-Migration 046.
--   2. conversations.book_blocked / book_offered_reply / book_passage_ids (nur der Server schreibt)
--   3. Schutz-Trigger protect_conversation_server_columns (Fassung 023, vollständig) + die drei Spalten
--   4. RPC get_book_hints(p_pattern_key): Fundstellen für den Spiegel (Teil, Teiltitel, Szenentitel),
--      ohne ⚠, 🔒 erst ab dem Folgeteil, nichts über den eigenen Lesestand hinaus
--
-- Rückgängig machen:
--   drop function if exists public.get_book_hints(text);
--   protect_conversation_server_columns in der Fassung aus 023_session_counting.sql neu anlegen;
--   alter table public.conversations
--     drop constraint if exists conversations_book_passage_ids_check,
--     drop column if exists book_passage_ids,
--     drop column if exists book_offered_reply,
--     drop column if exists book_blocked;
--   drop table if exists public.book_passages;

-- ── 1. book_passages ─────────────────────────────────────────────────────────
create table if not exists public.book_passages (
  id                    text primary key,               -- 'T3-D1', 'V-1', 'DD-2', 'EP-3' (aus der Landkarte)
  kind                  text not null check (kind in ('dialog', 'erklaerung', 'jerome')),
  position              int  not null check (position between 0 and 8),
  part_title            text not null,                  -- 'Die Kampagne', 'Vorweg', 'Davor und danach', 'Epilog'
  season_label          text,                           -- 'erster Frost'
  title                 text not null,
  situation_summary     text not null,                  -- „Situation“ bzw. bei Erklärungen „Inhalt“
  key_quote             text not null,                  -- wörtlich, ohne äußere Anführungszeichen
  bridge_question       text,
  fits_when             text,
  book_questions        text[] not null default '{}',
  pattern_keys          text[] not null default '{}',
  mechanisms            text[] not null default '{}',
  themes                text[] not null default '{}',
  coach_note            text,                           -- „Hinweis“ aus der Landkarte
  is_resolution         boolean not null default false, -- 🔒
  is_sensitive          boolean not null default false, -- ⚠
  sensitive_rule        text,                           -- „Sonderregel“ aus der Landkarte
  is_active             boolean not null default true,
  approved_by_jerome_at timestamptz,
  updated_at            timestamptz not null default now(),
  constraint book_passages_sensitive_rule_check
    check (not is_sensitive or sensitive_rule is not null)
);

comment on table public.book_passages is
  'Kuratierte, von Jerome freigegebene Stellen aus "Friedensstifter". Keine Nutzerdaten. Nur service_role. Pflege nur über scripts/build-book-seed.mjs.';

alter table public.book_passages enable row level security;
-- Keine Policies: Lesen nur serverseitig.
revoke all on table public.book_passages from public, anon, authenticated;
grant select on table public.book_passages to service_role;

-- ── 2. Spalten am Gespräch (nur der Server schreibt) ────────────────────────
alter table public.conversations
  add column if not exists book_blocked       boolean not null default false,
  add column if not exists book_offered_reply int,
  add column if not exists book_passage_ids   text[];

alter table public.conversations
  drop constraint if exists conversations_book_passage_ids_check;
alter table public.conversations
  add constraint conversations_book_passage_ids_check
    check (book_passage_ids is null or cardinality(book_passage_ids) between 1 and 2);

comment on column public.conversations.book_blocked is
  'Keine Buch-Bezüge in diesem Gespräch (Sicherheitsregel 4). Kein Wert, kein Grund gespeichert.';
comment on column public.conversations.book_offered_reply is
  'Nummer der Coach-Antwort, mit der das Buch-Fenster begann. null = nie angeboten.';
comment on column public.conversations.book_passage_ids is
  'Kennungen der mitgegebenen Buchstellen (max. 2), z. B. {T3-D1}. Keine Buchtexte.';

-- ── 3. Schutz-Trigger (Fassung 023 + book_*) ────────────────────────────────
-- Gilt nur für Client-Rollen. service_role, postgres und SECURITY-DEFINER-Funktionen
-- (consume_session läuft als Owner) sind nicht betroffen.
create or replace function public.protect_conversation_server_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.session_counted_at           := null;
    new.post_processed_at            := null;
    new.post_processed_message_count := 0;
    new.book_blocked                 := false;   -- 045
    new.book_offered_reply           := null;    -- 045
    new.book_passage_ids             := null;    -- 045
    return new;
  end if;

  if new.session_counted_at           is distinct from old.session_counted_at
  or new.post_processed_at            is distinct from old.post_processed_at
  or new.post_processed_message_count is distinct from old.post_processed_message_count
  or new.book_blocked                 is distinct from old.book_blocked        -- 045
  or new.book_offered_reply           is distinct from old.book_offered_reply  -- 045
  or new.book_passage_ids             is distinct from old.book_passage_ids then -- 045
    raise exception 'conversation_server_columns_are_server_only'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_conversation_server_columns() from public, anon, authenticated;

-- ── 4. RPC für den Spiegel ───────────────────────────────────────────────────
create or replace function public.get_book_hints(p_pattern_key text)
returns table (passage_id text, part_no int, part_name text, scene_title text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_status   text;
  v_progress int;
begin
  if not public.mfa_satisfied() then
    raise exception 'mfa_required' using errcode = '42501';
  end if;
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_pattern_key is null or p_pattern_key !~ '^[a-z_]{1,40}$' then
    return;
  end if;

  select p.book_status, p.book_progress
    into v_status, v_progress
    from public.profiles p
   where p.id = v_uid;

  if v_status is null or v_status not in ('read', 'reading') then
    return;
  end if;

  return query
    select b.id, b.position, b.part_title, b.title
      from public.book_passages b
     where b.is_active
       and b.approved_by_jerome_at is not null
       and not b.is_sensitive
       and p_pattern_key = any (b.pattern_keys)
       and (
             v_status = 'read'
          or (b.position <= v_progress
              and (not b.is_resolution or b.position < v_progress))
           )
     order by b.position, b.id
     limit 2;
end;
$$;

revoke all on function public.get_book_hints(text) from public, anon;
grant execute on function public.get_book_hints(text) to authenticated;
