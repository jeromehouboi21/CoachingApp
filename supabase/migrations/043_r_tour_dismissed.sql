-- 043: Paket R – Einstiegs-Rundgang (Handoff handoff-einstiegs-rundgang.md v1, J-R1 freigegeben 21.11.2026)
--
-- Inhalt:
--   1. profiles.tour_dismissed_at: Rundgang dauerhaft ausgeblendet ab diesem Zeitpunkt
--   2. RPC set_tour_dismissed(): setzt nur diese eine Spalte für den aufrufenden Nutzer
--
-- Schutz-Trigger (protect_profile_privileges, Fassung 040) bleibt unverändert:
--   - Er lässt SECURITY-DEFINER-Funktionen durch (current_user ≠ authenticated/anon).
--   - tour_dismissed_at steht nicht auf seiner Sperrliste (harmloser Zeitstempel am eigenen Konto).
-- RLS auf profiles bleibt unverändert. Export (Gruppe konto, alle profiles-Spalten) und
-- Kontolöschung (Zeile in profiles) erfassen die Spalte automatisch.
--
-- Rückgängig machen:
--   drop function if exists public.set_tour_dismissed();
--   alter table public.profiles drop column if exists tour_dismissed_at;

-- ── 1. Spalte ────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists tour_dismissed_at timestamptz;

-- ── 2. RPC (Muster wie confirm_age / set_learning_opt_in) ───────────────────
create or replace function public.set_tour_dismissed()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.mfa_satisfied() then
    raise exception 'mfa_required' using errcode = '42501';
  end if;
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  -- coalesce: der erste Zeitpunkt bleibt (Angriffstest R4)
  update public.profiles
     set tour_dismissed_at = coalesce(tour_dismissed_at, now())
   where id = auth.uid();
end;
$$;

revoke all on function public.set_tour_dismissed() from public, anon;
grant execute on function public.set_tour_dismissed() to authenticated;
