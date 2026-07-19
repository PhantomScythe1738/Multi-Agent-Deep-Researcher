-- ============================================================================
-- app_logs — application event audit log
--
-- Records signup, login, failed login, and error events. Writes go through
-- public.log_event() (SECURITY DEFINER) so that UNAUTHENTICATED events —
-- notably failed logins — can still be recorded without granting anon a
-- direct INSERT on the table.
--
-- The function derives user_id from auth.uid() and ignores any client-supplied
-- id, so a caller cannot attribute events to another user.
-- ============================================================================

create table if not exists public.app_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  "timestamp" timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete set null,
  details jsonb
);

create index if not exists app_logs_timestamp_idx on public.app_logs ("timestamp" desc);
create index if not exists app_logs_user_idx on public.app_logs (user_id, "timestamp" desc);
create index if not exists app_logs_event_type_idx on public.app_logs (event_type, "timestamp" desc);

alter table public.app_logs enable row level security;

-- Users may read only their own events. Anonymous events (failed logins) have a
-- NULL user_id and are visible only to the service role / SQL editor.
create policy "app_logs_select_own"
  on public.app_logs for select
  using (auth.uid() = user_id);

-- No direct INSERT/UPDATE/DELETE policies: all writes go via log_event().

/**
 * Record an application event.
 *
 * SECURITY DEFINER is required so anonymous callers can record failed logins.
 * It is deliberately narrow: INSERT-only, fixed search_path, and user_id is
 * taken from auth.uid() rather than from the caller.
 */
create or replace function public.log_event (
  p_event_type text,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Bound the event type so the table cannot be spammed with arbitrary labels.
  if p_event_type is null or length(p_event_type) > 64 then
    raise exception 'invalid event_type';
  end if;

  insert into public.app_logs (event_type, user_id, details)
  values (p_event_type, auth.uid(), coalesce(p_details, '{}'::jsonb));
end;
$$;

revoke all on function public.log_event(text, jsonb) from public;
grant execute on function public.log_event(text, jsonb) to anon, authenticated;
