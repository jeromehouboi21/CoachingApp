-- 029: Rate-Limits pro Nutzer (Kosten- und Missbrauchsschutz)
--
-- Feste Zeitfenster (z. B. Minute, Stunde, UTC-Tag). Jede Anfrage erhöht die Zähler
-- aller Regeln atomar; auch abgelehnte Anfragen zählen (wer weiter hämmert, bleibt
-- gesperrt, bis das Fenster abläuft). Aufruf nur durch Edge Functions (service_role),
-- user_id stammt dort aus dem JWT. Regeln/Werte: supabase/functions/_shared/rateLimit.ts

create table if not exists public.rate_limit_counters (
  user_id      uuid        not null references auth.users(id) on delete cascade,
  bucket       text        not null,
  window_start timestamptz not null,
  count        integer     not null default 0,
  primary key (user_id, bucket, window_start)
);

alter table public.rate_limit_counters enable row level security;
revoke all on public.rate_limit_counters from public, anon, authenticated;
grant all on public.rate_limit_counters to service_role;

-- p_rules: [{ "bucket": "chat_min", "limit": 10, "window_seconds": 60 }, ...]
-- Rückgabe: null = erlaubt, sonst { bucket, retry_after } der ersten überschrittenen Regel.
create or replace function public.consume_rate_limits(p_user_id uuid, p_rules jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r          jsonb;
  v_bucket   text;
  v_limit    integer;
  v_window   integer;
  v_start    timestamptz;
  v_count    integer;
  v_exceeded jsonb := null;
begin
  if p_user_id is null or jsonb_typeof(p_rules) <> 'array' then
    raise exception 'invalid_arguments' using errcode = '22023';
  end if;

  for r in select * from jsonb_array_elements(p_rules) loop
    v_bucket := left(r->>'bucket', 64);
    v_limit  := (r->>'limit')::integer;
    v_window := (r->>'window_seconds')::integer;
    if v_bucket is null or v_limit is null or v_window is null or v_window < 1 then
      raise exception 'invalid_rule' using errcode = '22023';
    end if;

    v_start := to_timestamp(floor(extract(epoch from now()) / v_window) * v_window);

    insert into public.rate_limit_counters as c (user_id, bucket, window_start, count)
    values (p_user_id, v_bucket, v_start, 1)
    on conflict (user_id, bucket, window_start)
      do update set count = c.count + 1
    returning c.count into v_count;

    if v_count > v_limit and v_exceeded is null then
      v_exceeded := jsonb_build_object(
        'bucket', v_bucket,
        'retry_after', greatest(1, ceil(extract(epoch from (v_start + make_interval(secs => v_window) - now()))))::integer
      );
    end if;
  end loop;

  return v_exceeded;
end;
$$;

revoke all on function public.consume_rate_limits(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.consume_rate_limits(uuid, jsonb) to service_role;

-- Aufräumen: Zähler älter als 2 Tage (längstes Fenster ist 1 Tag)
select cron.unschedule('purge-rate-limits')
where exists (select 1 from cron.job where jobname = 'purge-rate-limits');
select cron.schedule('purge-rate-limits', '23 3 * * *',
  $$ delete from public.rate_limit_counters where window_start < now() - interval '2 days' $$);
