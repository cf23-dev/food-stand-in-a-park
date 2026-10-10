-- ════════════════════════════════════════════════════════════════════════════
-- Food Stand in a Park — database schema
-- Run this in the Supabase SQL Editor (or via `supabase db push`).
-- Idempotent: safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ─── Enums ──────────────────────────────────────────────────────────────────
do $$ begin
  create type user_role as enum ('donor', 'volunteer', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pickup_status as enum ('open', 'claimed', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

-- ─── profiles ───────────────────────────────────────────────────────────────
-- One row per authenticated user (volunteers + admins). Mirrors auth.users.id.
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          user_role   not null default 'volunteer',
  name          text        not null default '',
  email         text        not null,
  phone         text,
  -- Volunteer home/base location, used for distance + notification radius.
  latitude      double precision,
  longitude     double precision,
  -- Admins must approve volunteers before they can claim pickups.
  approved      boolean     not null default false,
  notify_radius_miles integer not null default 10,
  created_at    timestamptz not null default now()
);

-- ─── food_banks ─────────────────────────────────────────────────────────────
create table if not exists public.food_banks (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  address          text not null,
  latitude         double precision not null,
  longitude        double precision not null,
  phone            text,
  website          text,
  hours            text,
  accepted_types   text[] not null default '{}',
  created_at       timestamptz not null default now()
);

-- ─── pickup_requests ────────────────────────────────────────────────────────
create table if not exists public.pickup_requests (
  id               uuid primary key default gen_random_uuid(),
  donor_name       text not null,
  donor_email      text not null,
  donor_phone      text,
  address          text not null,
  latitude         double precision not null,
  longitude        double precision not null,
  food_type        text not null,
  quantity         text,                       -- free-text estimate, e.g. "3 boxes"
  quantity_lbs     numeric,                    -- normalized weight for impact stats
  notes            text,
  earliest_pickup  timestamptz,
  latest_pickup    timestamptz,
  status           pickup_status not null default 'open',
  suggested_food_bank_id uuid references public.food_banks(id) on delete set null,
  created_at       timestamptz not null default now()
);

create index if not exists pickup_requests_status_idx on public.pickup_requests(status);
create index if not exists pickup_requests_created_idx on public.pickup_requests(created_at desc);

-- ─── volunteer_claims ───────────────────────────────────────────────────────
create table if not exists public.volunteer_claims (
  id             uuid primary key default gen_random_uuid(),
  volunteer_id   uuid not null references public.profiles(id) on delete cascade,
  pickup_id      uuid not null references public.pickup_requests(id) on delete cascade,
  food_bank_id   uuid references public.food_banks(id) on delete set null,
  delivery_photo_url text,
  claimed_at     timestamptz not null default now(),
  completed_at   timestamptz,
  reminder_sent_at timestamptz,
  unique (pickup_id)           -- a pickup can only be actively claimed once
);

create index if not exists volunteer_claims_volunteer_idx on public.volunteer_claims(volunteer_id);

-- ─── notifications ──────────────────────────────────────────────────────────
-- In-dashboard notifications for volunteers (mirrors the emails we send).
create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  volunteer_id uuid not null references public.profiles(id) on delete cascade,
  pickup_id    uuid references public.pickup_requests(id) on delete cascade,
  title        text not null,
  body         text,
  read         boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists notifications_volunteer_idx on public.notifications(volunteer_id, read);

-- ─── feedback ───────────────────────────────────────────────────────────────
-- Donor feedback after a completed pickup. Private to admins.
create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  pickup_id   uuid references public.pickup_requests(id) on delete set null,
  donor_email text,
  rating      int check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now(),
  unique (pickup_id)
);

-- ════════════════════════════════════════════════════════════════════════════
-- Helper functions
-- ════════════════════════════════════════════════════════════════════════════

-- Great-circle distance in miles (haversine). Avoids needing PostGIS.
create or replace function public.distance_miles(
  lat1 double precision, lon1 double precision,
  lat2 double precision, lon2 double precision
) returns double precision
language sql immutable as $$
  select 3958.8 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) *
    power(sin(radians(lon2 - lon1) / 2), 2)
  ));
$$;

-- Nearest food bank to a given coordinate.
create or replace function public.nearest_food_bank(
  in_lat double precision, in_lon double precision
) returns public.food_banks
language sql stable as $$
  select fb.*
  from public.food_banks fb
  order by public.distance_miles(in_lat, in_lon, fb.latitude, fb.longitude) asc
  limit 1;
$$;

-- Volunteers within `radius` miles of a coordinate (used for notifications).
create or replace function public.volunteers_within_radius(
  in_lat double precision, in_lon double precision, radius double precision
) returns setof public.profiles
language sql stable as $$
  select p.*
  from public.profiles p
  where p.role = 'volunteer'
    and p.approved = true
    and p.latitude is not null
    and p.longitude is not null
    and public.distance_miles(in_lat, in_lon, p.latitude, p.longitude) <= radius;
$$;

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'volunteer')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Convenience: is the current user an admin?
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- Row Level Security
-- ════════════════════════════════════════════════════════════════════════════
alter table public.profiles         enable row level security;
alter table public.food_banks       enable row level security;
alter table public.pickup_requests  enable row level security;
alter table public.volunteer_claims enable row level security;
alter table public.notifications    enable row level security;
alter table public.feedback         enable row level security;

-- profiles ────────────────────────────────────────────────────────────────
drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles admin all" on public.profiles;
create policy "profiles admin all" on public.profiles
  for all using (public.is_admin());

-- food_banks: world-readable; only admins write ─────────────────────────────
drop policy if exists "food_banks read" on public.food_banks;
create policy "food_banks read" on public.food_banks
  for select using (true);

drop policy if exists "food_banks admin write" on public.food_banks;
create policy "food_banks admin write" on public.food_banks
  for all using (public.is_admin()) with check (public.is_admin());

-- pickup_requests ───────────────────────────────────────────────────────────
-- Approved volunteers + admins can read requests. (Public submission happens
-- server-side with the service-role key, bypassing RLS.)
drop policy if exists "pickups volunteer read" on public.pickup_requests;
create policy "pickups volunteer read" on public.pickup_requests
  for select using (
    public.is_admin()
    or exists (select 1 from public.profiles p
               where p.id = auth.uid() and p.role = 'volunteer' and p.approved)
  );

drop policy if exists "pickups admin write" on public.pickup_requests;
create policy "pickups admin write" on public.pickup_requests
  for update using (public.is_admin()) with check (public.is_admin());

-- volunteer_claims ──────────────────────────────────────────────────────────
drop policy if exists "claims read" on public.volunteer_claims;
create policy "claims read" on public.volunteer_claims
  for select using (auth.uid() = volunteer_id or public.is_admin());

drop policy if exists "claims insert self" on public.volunteer_claims;
create policy "claims insert self" on public.volunteer_claims
  for insert with check (
    auth.uid() = volunteer_id
    and exists (select 1 from public.profiles p
                where p.id = auth.uid() and p.role = 'volunteer' and p.approved)
  );

drop policy if exists "claims update self" on public.volunteer_claims;
create policy "claims update self" on public.volunteer_claims
  for update using (auth.uid() = volunteer_id or public.is_admin());

drop policy if exists "claims delete self" on public.volunteer_claims;
create policy "claims delete self" on public.volunteer_claims
  for delete using (auth.uid() = volunteer_id or public.is_admin());

-- notifications ─────────────────────────────────────────────────────────────
drop policy if exists "notifications own read" on public.notifications;
create policy "notifications own read" on public.notifications
  for select using (auth.uid() = volunteer_id or public.is_admin());

drop policy if exists "notifications own update" on public.notifications;
create policy "notifications own update" on public.notifications
  for update using (auth.uid() = volunteer_id);

-- feedback: admins read; inserts happen server-side via the service role ─────
drop policy if exists "feedback admin read" on public.feedback;
create policy "feedback admin read" on public.feedback
  for select using (public.is_admin());

-- ════════════════════════════════════════════════════════════════════════════
-- Storage: delivery photos bucket (run once)
-- ════════════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
values ('delivery-photos', 'delivery-photos', true)
on conflict (id) do nothing;

drop policy if exists "delivery photos upload" on storage.objects;
create policy "delivery photos upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'delivery-photos');

drop policy if exists "delivery photos read" on storage.objects;
create policy "delivery photos read" on storage.objects
  for select using (bucket_id = 'delivery-photos');
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
