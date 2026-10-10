-- Run once in the Supabase SQL Editor before using Hours & signatures.
begin;

-- Role/approval must not be editable through the existing self-update policy.
create or replace function public.protect_profile_authority()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_admin() and
    (new.role is distinct from old.role or new.approved is distinct from old.approved or new.id is distinct from old.id) then
    raise exception 'Only administrators can change account permissions.' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists protect_profile_authority on public.profiles;
create trigger protect_profile_authority before update on public.profiles
for each row execute function public.protect_profile_authority();

-- Signup metadata is supplied by the user and cannot grant administrator rights.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, email, name, role)
  values(new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''), 'volunteer')
  on conflict(id) do nothing;
  return new;
end $$;

create table if not exists public.volunteer_hours (
  id uuid primary key default gen_random_uuid(),
  volunteer_id uuid not null references public.profiles(id) on delete restrict,
  volunteer_name text not null,
  claim_id uuid references public.volunteer_claims(id) on delete restrict,
  service_date date not null,
  duration_minutes integer not null check(duration_minutes between 1 and 1440),
  activity text not null check(length(trim(activity)) between 3 and 200),
  notes text not null default '' check(length(notes) <= 2000),
  program text not null default '' check(length(program) <= 200),
  status text not null default 'draft' check(status in ('draft','pending','returned','signed')),
  review_note text,
  signer_id uuid references public.profiles(id) on delete restrict,
  signer_name text,
  signer_title text,
  signature jsonb,
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  check ((status = 'signed' and signer_id is not null and signer_id <> volunteer_id
    and length(trim(signer_name)) between 2 and 120 and length(trim(signer_title)) between 2 and 120
    and signature is not null and signed_at is not null)
    or (status <> 'signed' and signer_id is null and signer_name is null and signer_title is null
      and signature is null and signed_at is null))
);
create unique index if not exists volunteer_hours_claim_idx on public.volunteer_hours(claim_id) where claim_id is not null;
create index if not exists volunteer_hours_owner_idx on public.volunteer_hours(volunteer_id, service_date desc);
create index if not exists volunteer_hours_status_idx on public.volunteer_hours(status, updated_at);

create table if not exists public.volunteer_hour_events (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null, -- Preserve the audit event when a draft is deleted.
  volunteer_id uuid not null references public.profiles(id) on delete restrict,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  action text not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists volunteer_hour_events_entry_idx on public.volunteer_hour_events(entry_id, created_at);
alter table public.volunteer_hours enable row level security;
alter table public.volunteer_hour_events enable row level security;
drop policy if exists "hours read own or admin" on public.volunteer_hours;
create policy "hours read own or admin" on public.volunteer_hours for select to authenticated
using(auth.uid() = volunteer_id or public.is_admin());
drop policy if exists "hour events read own or admin" on public.volunteer_hour_events;
create policy "hour events read own or admin" on public.volunteer_hour_events for select to authenticated
using(auth.uid() = volunteer_id or public.is_admin());
revoke all on public.volunteer_hours, public.volunteer_hour_events from anon, authenticated;
grant select on public.volunteer_hours, public.volunteer_hour_events to authenticated;
grant all on public.volunteer_hours, public.volunteer_hour_events to service_role;

-- All transitions, audits and in-app notifications commit together. Row locks
-- and version checks stop stale edits and simultaneous approval/withdrawal.
create or replace function public.volunteer_hour_command(command jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor public.profiles;
  entry public.volunteer_hours;
  action text := command->>'action';
  signature jsonb;
  stroke jsonb;
  point jsonb;
  point_count integer := 0;
  has_movement boolean := false;
  first_x numeric;
  first_y numeric;
begin
  select * into actor from public.profiles where id = auth.uid();
  if actor.id is null or actor.role not in ('volunteer','admin') then
    raise exception 'Sign in with a volunteer account.' using errcode = '42501';
  end if;
  if action not in ('create','save','request','withdraw','delete','return','sign') or action is null then
    raise exception 'Unknown action.' using errcode = '22023';
  end if;
  if action = 'create' then
    entry.id := (command->>'id')::uuid;
    entry.volunteer_id := actor.id;
  else
    select * into entry from public.volunteer_hours where id = (command->>'id')::uuid for update;
    if entry.id is null then raise exception 'Hour entry not found.' using errcode = 'P0002'; end if;
    if entry.volunteer_id <> actor.id and actor.role <> 'admin' then
      raise exception 'You cannot access this entry.' using errcode = '42501';
    end if;
    if (command->>'version')::integer is distinct from entry.version then
      raise exception 'This entry changed. Refresh and try again.' using errcode = '40001';
    end if;
  end if;
  if action in ('create','save','request','withdraw','delete') and entry.volunteer_id <> actor.id then
    raise exception 'Only the volunteer can edit or submit their hours.' using errcode = '42501';
  end if;
  if action in ('return','sign') then
    if actor.role <> 'admin' or actor.id = entry.volunteer_id then
      raise exception 'An administrator other than the volunteer must review these hours.' using errcode = '42501';
    end if;
    if entry.status <> 'pending' then raise exception 'Only pending requests can be reviewed.' using errcode = '22023'; end if;
  end if;
  if action in ('save','request','delete') and entry.status not in ('draft','returned') then
    raise exception 'Withdraw the pending request before editing. Signed records are locked.' using errcode = '22023';
  end if;
  if action in ('create','save') then
    if jsonb_typeof(command->'submit') is distinct from 'boolean' then
      raise exception 'Specify whether to request a signature.' using errcode = '22023';
    end if;
    entry.service_date := (command->>'service_date')::date;
    entry.duration_minutes := (command->>'duration_minutes')::integer;
    entry.activity := trim(command->>'activity');
    entry.notes := coalesce(trim(command->>'notes'), '');
    entry.program := coalesce(trim(command->>'program'), '');
    entry.claim_id := nullif(command->>'claim_id', '')::uuid;
    entry.volunteer_name := actor.name;
    entry.status := case when (command->>'submit')::boolean then 'pending' else 'draft' end;
    if entry.service_date > (now() at time zone 'Pacific/Kiritimati')::date then
      raise exception 'Service date cannot be in the future.' using errcode = '22023';
    end if;
    if entry.claim_id is not null and not exists(select 1 from public.volunteer_claims
      where id = entry.claim_id and volunteer_id = actor.id and completed_at is not null) then
      raise exception 'Choose one of your completed pickups.' using errcode = '22023';
    end if;
  elsif action = 'request' then
    entry.status := 'pending';
    entry.volunteer_name := actor.name;
  elsif action = 'withdraw' then
    if entry.status <> 'pending' then raise exception 'Only pending requests can be withdrawn.' using errcode = '22023'; end if;
    entry.status := 'draft';
  elsif action = 'return' then
    entry.review_note := trim(command->>'review_note');
    if entry.review_note is null or length(entry.review_note) not between 3 and 2000 then
      raise exception 'Explain the changes needed.' using errcode = '22023';
    end if;
    entry.status := 'returned';
  elsif action = 'sign' then
    if command->'confirmed' is distinct from 'true'::jsonb then
      raise exception 'Confirm you verified the service.' using errcode = '22023';
    end if;
    signature := command->'signature';
    if signature->>'kind' = 'drawn' then
      if jsonb_typeof(signature->'strokes') is distinct from 'array' then
        raise exception 'Invalid signature.' using errcode = '22023';
      end if;
      if jsonb_array_length(signature->'strokes') not between 1 and 100 then
        raise exception 'Please draw your signature.' using errcode = '22023';
      end if;
      for stroke in select value from jsonb_array_elements(signature->'strokes') loop
        if jsonb_typeof(stroke) <> 'array' then raise exception 'Invalid stroke.' using errcode = '22023'; end if;
        if jsonb_array_length(stroke) not between 2 and 2000 then raise exception 'Invalid stroke.' using errcode = '22023'; end if;
        first_x := (stroke->0->>0)::numeric;
        first_y := (stroke->0->>1)::numeric;
        for point in select value from jsonb_array_elements(stroke) loop
          point_count := point_count + 1;
          if point_count > 10000 then raise exception 'Signature is too large.' using errcode = '22023'; end if;
          if jsonb_typeof(point) <> 'array' then raise exception 'Invalid point.' using errcode = '22023'; end if;
          if jsonb_array_length(point) <> 2 or jsonb_typeof(point->0) is distinct from 'number'
            or jsonb_typeof(point->1) is distinct from 'number'
            or (point->>0)::numeric not between 0 and 600 or (point->>1)::numeric not between 0 and 200 then
            raise exception 'Invalid signature point.' using errcode = '22023';
          end if;
          if abs((point->>0)::numeric - first_x) >= 2 or abs((point->>1)::numeric - first_y) >= 2 then has_movement := true; end if;
        end loop;
      end loop;
      if point_count > 10000 or not has_movement then raise exception 'Please draw your signature.' using errcode = '22023'; end if;
    elsif signature->>'kind' = 'typed' then
      if jsonb_typeof(signature->'text') is distinct from 'string' or length(trim(signature->>'text')) not between 2 and 120 then
        raise exception 'Enter your signature.' using errcode = '22023';
      end if;
    else raise exception 'Please provide a signature.' using errcode = '22023'; end if;
    entry.status := 'signed';
    entry.signer_id := actor.id;
    entry.signer_name := trim(command->>'signer_name');
    entry.signer_title := trim(command->>'signer_title');
    entry.signature := case when signature->>'kind' = 'drawn'
      then jsonb_build_object('kind', 'drawn', 'strokes', signature->'strokes')
      else jsonb_build_object('kind', 'typed', 'text', trim(signature->>'text')) end;
    entry.signed_at := now();
    if entry.signer_name is null or entry.signer_title is null then
      raise exception 'Enter the signer name and title.' using errcode = '22023';
    end if;
  end if;
  if entry.status = 'pending' and length(trim(entry.volunteer_name)) < 2 then
    raise exception 'Add your full name to your profile before requesting a signature.' using errcode = '22023';
  end if;
  if action = 'create' then
    insert into public.volunteer_hours(id, volunteer_id, volunteer_name, claim_id, service_date, duration_minutes, activity, notes, program, status)
    values(entry.id, actor.id, entry.volunteer_name, entry.claim_id, entry.service_date, entry.duration_minutes, entry.activity, entry.notes, entry.program, entry.status)
    returning * into entry;
  elsif action = 'delete' then
    delete from public.volunteer_hours where id = entry.id;
  else
    update public.volunteer_hours set volunteer_name = entry.volunteer_name, claim_id = entry.claim_id,
      service_date = entry.service_date, duration_minutes = entry.duration_minutes, activity = entry.activity,
      notes = entry.notes, program = entry.program, status = entry.status, review_note = entry.review_note,
      signer_id = entry.signer_id, signer_name = entry.signer_name, signer_title = entry.signer_title,
      signature = entry.signature, signed_at = entry.signed_at, updated_at = now(), version = version + 1
    where id = entry.id returning * into entry;
  end if;
  insert into public.volunteer_hour_events(entry_id, volunteer_id, actor_id, action, snapshot)
  values(entry.id, entry.volunteer_id, actor.id, action, to_jsonb(entry));
  if action in ('sign','return') then
    insert into public.notifications(volunteer_id, title, body)
    values(entry.volunteer_id, case when action = 'sign' then 'Your volunteer hours are signed' else 'Your hour request needs changes' end,
      entry.activity || ' (' || entry.service_date || ')' || case when action = 'return' then ': ' || entry.review_note else '' end);
  end if;
  return to_jsonb(entry);
end $$;
revoke all on function public.volunteer_hour_command(jsonb) from public, anon, authenticated;
grant execute on function public.volunteer_hour_command(jsonb) to authenticated;
revoke all on function public.protect_profile_authority() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
commit;
