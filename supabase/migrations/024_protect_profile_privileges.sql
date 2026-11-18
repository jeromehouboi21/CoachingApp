-- 024: Privilegierte Profilfelder sind nur serverseitig änderbar (Security-Paket A, S-01b).
--
-- Erlaubt bleiben: service_role, postgres, Cron, SECURITY-DEFINER-Funktionen
-- (z. B. redeem_invite_code, consume_session), Auth-Trigger handle_new_user.
-- Gesperrt für die Client-Rollen authenticated/anon: id, is_admin, is_beta_tester, plan,
-- session_limit, sessions_used_this_month, invited_at, invited_by, consent_ip, created_at.
--
-- Ein Update, das unveränderte Werte mitschickt (select * → update), ist erlaubt,
-- weil nur ÄNDERUNGEN geprüft werden.
-- Voraussetzung (Welle 1, erledigt): Der Client schreibt profiles nicht mehr per upsert.

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Client-Inserts sind nach 025 ohnehin nicht mehr erlaubt; das hier ist die zweite Linie.
    new.is_admin                 := false;
    new.is_beta_tester           := false;
    new.plan                     := 'free';
    new.session_limit            := 3;     -- Live-Default laut Audit K
    new.sessions_used_this_month := 0;
    new.invited_at               := null;
    new.invited_by               := null;
    new.consent_ip               := null;
    new.created_at               := now();
    return new;
  end if;

  if new.id                       is distinct from old.id
  or new.is_admin                 is distinct from old.is_admin
  or new.is_beta_tester           is distinct from old.is_beta_tester
  or new.plan                     is distinct from old.plan
  or new.session_limit            is distinct from old.session_limit
  or new.sessions_used_this_month is distinct from old.sessions_used_this_month
  or new.invited_at               is distinct from old.invited_at
  or new.invited_by               is distinct from old.invited_by
  or new.consent_ip               is distinct from old.consent_ip
  or new.created_at               is distinct from old.created_at then
    raise exception 'profile_privileged_columns_are_server_only'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_profile_privileges() from public, anon, authenticated;

drop trigger if exists trg_protect_profile_privileges on public.profiles;
create trigger trg_protect_profile_privileges
  before insert or update on public.profiles
  for each row execute function public.protect_profile_privileges();
