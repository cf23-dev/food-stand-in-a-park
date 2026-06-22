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
