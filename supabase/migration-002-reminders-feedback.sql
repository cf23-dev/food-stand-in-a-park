-- ════════════════════════════════════════════════════════════════════════════
-- Migration 002 — pickup reminders + donor feedback
-- Run this ONCE in the Supabase SQL Editor (your DB already has the base schema).
-- Idempotent: safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

-- Track when the "2 hours before pickup" reminder was sent, so the scheduled
-- job never sends it twice.
alter table public.volunteer_claims
  add column if not exists reminder_sent_at timestamptz;

-- Donor feedback — private to admins. Submissions come in server-side via the
-- service-role key, so no public insert policy is needed.
create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  pickup_id   uuid references public.pickup_requests(id) on delete set null,
  donor_email text,
  rating      int check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now(),
  unique (pickup_id)            -- one feedback entry per pickup
);

alter table public.feedback enable row level security;

drop policy if exists "feedback admin read" on public.feedback;
create policy "feedback admin read" on public.feedback
  for select using (public.is_admin());
