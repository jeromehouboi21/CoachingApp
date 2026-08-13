-- Strukturierter Beta-Fragebogen. Additiv neben user_feedback (Freitext-Feedback,
-- Beta-Feedback-Modal, admin-feedback Edge Function) — bleibt unverändert.
-- Siehe handoff-beta-fragebogen-v1.md.

create table if not exists feedback_surveys (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        not null references auth.users(id) on delete cascade,

  -- Kontext (für spätere Filterung/Segmentierung)
  plan_at_submission    text,                 -- 'free' | 'tester' | 'premium' (zum Zeitpunkt der Abgabe)
  usage_frequency       text,                 -- Antwort auf ctx_frequency (Rohwert)
  weeks_testing         text,                 -- Antwort auf ctx_weeks (Rohwert)

  -- Zwei Top-Kennzahlen denormalisiert für schnellen Blick im Dashboard
  overall_satisfaction  smallint    check (overall_satisfaction between 1 and 5),
  overall_recommend     smallint    check (overall_recommend  between 1 and 5),

  -- Alle Antworten: { "<question_key>": { "rating": 1-5 }, "<key>": { "text": "..." }, ... }
  answers               jsonb       not null default '{}'::jsonb,

  app_version           text,                 -- optional, z.B. aus import.meta.env, zur Zuordnung
  created_at            timestamptz not null default now()
);

create index if not exists idx_feedback_surveys_user       on feedback_surveys (user_id);
create index if not exists idx_feedback_surveys_created_at on feedback_surveys (created_at desc);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table feedback_surveys enable row level security;

create policy "Users insert own survey"
  on feedback_surveys for insert
  with check (auth.uid() = user_id);

create policy "Users read own survey"
  on feedback_surveys for select
  using (auth.uid() = user_id);

-- ── GRANTS (nicht vergessen — vgl. Lehre aus Migration 014/015) ─────────────
grant select, insert on feedback_surveys to authenticated;
grant all           on feedback_surveys to service_role;  -- Admin/Dashboard-Auswertung

-- ── Auswertungs-View: JSONB → eine Zeile je Antwort ─────────────────────────
create or replace view feedback_survey_scores as
select
  s.id                          as survey_id,
  s.user_id,
  s.created_at,
  s.plan_at_submission,
  kv.key                        as question_key,
  (kv.value->>'rating')::smallint as rating,
  kv.value->>'text'             as answer_text
from feedback_surveys s
cross join lateral jsonb_each(s.answers) as kv(key, value)
where (kv.value ? 'rating') or (kv.value ? 'text');

grant select on feedback_survey_scores to service_role;
