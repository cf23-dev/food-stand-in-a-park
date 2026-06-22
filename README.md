# 🥕 Food Stand in a Park

A full-stack web app that coordinates food donation pickups between community
donors and volunteers, routing donations to nearby food banks.

- **Donors** submit a public pickup request (no account needed).
- **Volunteers** sign up, see nearby pickups on a map, claim them, and deliver to a food bank.
- **Admins** manage volunteers, pickups, food banks, and export data.

Built with **Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Supabase
(Postgres + Auth + Storage) · Google Maps · Resend**, and deployable on **Vercel**.

---

## Table of contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Environment variables](#environment-variables)
5. [Supabase setup](#supabase-setup)
6. [Google Maps setup](#google-maps-setup)
7. [Email setup (Resend)](#email-setup-resend)
8. [Local development](#local-development)
9. [Seed data & test accounts](#seed-data--test-accounts)
10. [Deploying to Vercel](#deploying-to-vercel)
11. [Project structure](#project-structure)
12. [Database schema](#database-schema)
13. [API routes](#api-routes)
14. [Security notes](#security-notes)

---

## Features

| Area | Highlights |
| --- | --- |
| Donor | Public pickup form, address autocomplete, confirmation page, confirmation email, auto status `Open`, nearest-food-bank suggestion |
| Volunteer | Auth (email/password), interactive map + list of nearby pickups, distance-to-pickup, claim/complete, photo upload, pickup history, impact stats (pickups, lbs, food banks served), in-dashboard + email notifications |
| Food banks | Public directory, nearest-bank calculation, driving directions link |
| Admin | View all pickups/volunteers/food banks, approve/remove volunteers, edit pickup status, add food banks, CSV export/reports |
| Platform | Mobile-first responsive design, accessible (skip link, focus rings, ARIA), loading & error states, RLS-secured database |

---

## Architecture

```
Browser ──► Next.js (App Router)
              │
              ├── Server Components / Route Handlers
              │        │
              │        ├── Supabase (anon key + RLS)  ← signed-in reads/writes
              │        ├── Supabase (service role)    ← public donor inserts, notifications
              │        ├── Google Maps server APIs    ← geocode, distance, directions
              │        └── Resend                     ← transactional email
              │
              └── Client Components ──► Supabase JS, Google Maps JS
```

Notifications, geocoding, and emails are **best-effort**: if a key is missing the
app still works (emails log to the console, the map shows a placeholder, etc.),
so you can develop incrementally.

---

## Prerequisites

- Node.js 18.18+ (20+ recommended)
- A free [Supabase](https://supabase.com) project
- A [Google Cloud](https://console.cloud.google.com) project with Maps APIs enabled
- A [Resend](https://resend.com) account (optional for local dev)

---

## Environment variables

Copy the template and fill in values:

```bash
cp .env.example .env.local
```

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | client+server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client+server | Public anon key (RLS-protected) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Privileged inserts (donor requests, notifications, admin) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | client | Maps JS + Places autocomplete (restrict by HTTP referrer) |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | client | Optional vector map id |
| `GOOGLE_MAPS_SERVER_KEY` | server | Geocoding / Distance Matrix / Directions (restrict by API) |
| `RESEND_API_KEY` | server | Transactional email (omit → emails log to console) |
| `EMAIL_FROM` | server | Verified sender, e.g. `"Food Stand <hello@yourdomain.org>"` |
| `NEXT_PUBLIC_SITE_URL` | client+server | Base URL used in emails |
| `NEXT_PUBLIC_DEFAULT_NOTIFY_RADIUS_MILES` | client+server | Default volunteer notification radius |

---

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com). Copy the **Project URL**,
   **anon key**, and **service_role key** from *Project Settings → API* into `.env.local`.
2. Open the **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql).
   This creates all tables, enums, helper functions (`distance_miles`,
   `nearest_food_bank`, `volunteers_within_radius`), the new-user trigger, RLS
   policies, and the `delivery-photos` storage bucket.
3. (Optional) Run [`supabase/seed.sql`](supabase/seed.sql) for sample food banks
   and pickups.
4. Under *Authentication → Providers*, enable **Email**. For quick local testing
   you can turn **"Confirm email"** off so signups log in immediately.

> **Why a service-role key?** Donors are anonymous, so the public submission
> endpoint and the volunteer-notification logic run server-side with elevated
> privileges. The key is never exposed to the browser.

---

## Google Maps setup

1. In Google Cloud, enable: **Maps JavaScript API**, **Places API**,
   **Geocoding API**, **Directions API**, **Distance Matrix API**.
2. Create **two** API keys:
   - A *browser* key (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) restricted by HTTP referrer
     (`localhost:3000`, your Vercel domains).
   - A *server* key (`GOOGLE_MAPS_SERVER_KEY`) restricted to the geocoding/
     directions/distance APIs.
3. (Optional) Create a **Map ID** for Advanced Markers and add it as
   `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`.

The app gracefully degrades without Maps keys (plain address inputs, a map
placeholder, haversine distances computed locally).

---

## Email setup (Resend)

1. Create an API key at [resend.com](https://resend.com) → **API Keys**.
2. Verify a sending domain and set `EMAIL_FROM` to an address on it.
3. Without `RESEND_API_KEY`, all emails are logged to the server console — useful
   for local development.

---

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in values
npm run dev                  # http://localhost:3000
```

Useful scripts:

```bash
npm run build       # production build
npm run start       # run the production build
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
npm run seed        # programmatic seed (needs service-role key in env)
```

---

## Seed data & test accounts

1. Run `supabase/seed.sql` (or `npm run seed`) for food banks + open pickups.
2. **Create an admin:** sign up at `/volunteer/signup`, then in the SQL editor:
   ```sql
   update public.profiles set role = 'admin', approved = true
     where email = 'you@example.com';
   ```
3. **Create an approved volunteer:** sign up, then:
   ```sql
   update public.profiles
     set approved = true, latitude = 47.61, longitude = -122.33
     where email = 'volunteer@example.com';
   ```
   (Or approve them from the admin dashboard; set their location from the
   volunteer dashboard prompt.)

---

## Deploying to Vercel

1. Push this repo to GitHub.
2. In [Vercel](https://vercel.com), **New Project → Import** the repo. The
   framework preset auto-detects Next.js.
3. Add **all** environment variables from `.env.example` under
   *Settings → Environment Variables* (Production + Preview). Set
   `NEXT_PUBLIC_SITE_URL` to your Vercel URL.
4. In Supabase *Authentication → URL Configuration*, add your Vercel domain to
   **Site URL** and **Redirect URLs**.
5. In Google Cloud, add your Vercel domains to the browser key's referrer
   restrictions.
6. **Deploy.** Vercel builds with `npm run build` and serves the App Router.

---

## Project structure

```
app/
  layout.tsx                 root layout (header/footer, skip link, metadata)
  page.tsx                   landing page
  loading.tsx error.tsx not-found.tsx
  donate/                    public donor form + confirmation
  food-banks/                public directory
  volunteer/                 login, signup, dashboard
  admin/                     admin dashboard (gated by middleware + page check)
  api/
    pickups/                 POST create · [id]/claim · [id]/complete
    geocode/  profile/       volunteer helpers
    admin/                   volunteers · pickups · food-banks · export(CSV)
components/                  Header/Footer, forms, map, dashboards, ui primitives
lib/
  supabase/                  client, server, middleware factories
  types.ts validation.ts geo.ts maps.ts email.ts auth.ts
supabase/
  schema.sql                 tables, RLS, functions, storage
  seed.sql                   sample data
scripts/seed.ts              programmatic seeding
middleware.ts                session refresh + route protection
```

---

## Database schema

See [`supabase/schema.sql`](supabase/schema.sql). Tables: `profiles`,
`food_banks`, `pickup_requests`, `volunteer_claims`, `notifications`. Distances
use a SQL `haversine` function (`distance_miles`) — **no PostGIS required**.
Every table has Row Level Security enabled.

---

## API routes

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/pickups` | public | Create pickup, geocode, suggest food bank, notify volunteers, email donor |
| POST | `/api/pickups/[id]/claim` | volunteer | Claim an open pickup, email donor |
| POST | `/api/pickups/[id]/complete` | volunteer | Mark complete, attach photo + weight |
| POST | `/api/geocode` | any | Address → coordinates |
| PATCH | `/api/profile` | auth | Update name / base location / radius |
| PATCH·DELETE | `/api/admin/volunteers/[id]` | admin | Approve/revoke / remove |
| PATCH | `/api/admin/pickups/[id]` | admin | Change status |
| POST | `/api/admin/food-banks` | admin | Add food bank |
| GET | `/api/admin/export?type=…` | admin | CSV export |

---

## Security notes

- **RLS everywhere.** The anon key can only do what policies allow; the
  service-role key is used server-side only.
- **Route protection.** `middleware.ts` refreshes sessions and redirects
  unauthenticated users away from `/volunteer/dashboard` and `/admin`; admin
  pages additionally verify the `admin` role.
- **Volunteer approval gate.** New volunteers can browse but can't claim until an
  admin approves them (enforced in the claim policy *and* the API route).
- **Never commit `.env.local`.** It's git-ignored.

---

Made with 💚 for community food rescue.
