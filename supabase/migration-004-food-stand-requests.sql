-- Save food stand interest for volunteers and administrators.
-- Run once in the Supabase SQL Editor. Safe to re-run.
begin;
create table if not exists public.food_stand_requests (
  id uuid primary key default gen_random_uuid(),
  volunteer_id uuid not null references public.profiles(id),
  name text not null check (length(trim(name)) between 1 and 120),
  email text not null,
  age integer not null check (age between 1 and 120),
  phone text not null check (length(trim(phone)) between 7 and 40),
  state_zip text not null check (length(trim(state_zip)) between 3 and 120),
  referral text not null default '' check (length(referral) <= 2000),
  receive_updates boolean not null default false,
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  created_at timestamptz not null default now()
);
create index if not exists food_stand_requests_created_idx on public.food_stand_requests(created_at desc);
alter table public.food_stand_requests enable row level security;
grant select, insert, update on public.food_stand_requests to authenticated;
revoke all on public.food_stand_requests from anon;
drop policy if exists food_stand_requests_read on public.food_stand_requests;
create policy food_stand_requests_read on public.food_stand_requests for select to authenticated
  using (volunteer_id = auth.uid() or public.is_admin());
drop policy if exists food_stand_requests_insert on public.food_stand_requests;
create policy food_stand_requests_insert on public.food_stand_requests for insert to authenticated
  with check (volunteer_id = auth.uid() and email = (auth.jwt()->>'email') and status = 'new');
drop policy if exists food_stand_requests_update on public.food_stand_requests;
create policy food_stand_requests_update on public.food_stand_requests for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
commit;
