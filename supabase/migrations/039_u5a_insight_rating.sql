-- 039: U5a – Deine Einschätzung an Erkenntnissen (Handoff U5a, freigegeben 19.11.2026, E-U5a-7)
--
-- user_rating: nur der Nutzer bewertet (UX 4.3d) – helpful (✦ Hat mich weitergebracht),
--              unclear (Verstehe ich nicht), disagree (Teile ich nicht); null = keine Einschätzung
-- rated_at:    Zeitpunkt der letzten Einschätzung (Zeitachse ✦, U5b: Lernen seit dem letzten Lauf)
-- follows_insight_id: Selbstwirksamkeits-Moment verweist auf die Ursprungserkenntnis (befüllt erst in U5b)
--
-- Der Client setzt user_rating/rated_at über die bestehende Update-Policy für eigene Erkenntnisse
-- (025, plus restriktive MFA-Policy aus 037). Export (S-16) und Löschtest erfassen die Spalten automatisch.
--
-- Rückgängig machen:
--   alter table public.insights drop column if exists follows_insight_id,
--     drop column if exists rated_at, drop column if exists user_rating;

alter table public.insights
  add column if not exists user_rating text
    check (user_rating in ('helpful', 'unclear', 'disagree')),
  add column if not exists rated_at timestamptz,
  add column if not exists follows_insight_id uuid
    references public.insights (id) on delete set null;

create index if not exists insights_user_rating_idx
  on public.insights (user_id, user_rating) where user_rating is not null;
