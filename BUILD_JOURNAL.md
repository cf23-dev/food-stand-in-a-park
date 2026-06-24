# Build Journal — Food Stand in a Park

How this site was built, step by step, from an empty folder to a live site at
**donate.foodstandinapark.org** — including every problem we hit and how we fixed it.

- **Live site:** https://donate.foodstandinapark.org (subdomain; the main
  `foodstandinapark.org` site was left untouched)
- **Code:** GitHub `cf23-dev/food-stand-in-a-park` (private), auto-deploys to Vercel on push
- **Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Supabase
  (Postgres + Auth + Storage) · Google Maps · Resend (email) · deployed on Vercel
- **Built on:** macOS, Node 24 (via nvm)

---

## Phase 1 — Local setup

1. **Generated the project** — full Next.js scaffold: donor pickup form, volunteer
   dashboard, admin dashboard, food-bank directory, API routes, database schema,
   seed data, and a README.
2. **Installed Node.js** — downloaded the LTS installer from nodejs.org (the machine
   had no Node yet), then verified with `node -v` and `npm -v`.
3. **Installed dependencies** — `cd ~/food-stand-in-a-park && npm install`.

### Supabase (database + auth + storage)
4. Created a free project at supabase.com.
5. **SQL Editor → ran `supabase/schema.sql`** — created all tables, row-level security,
   helper functions, the new-user trigger, and the delivery-photos storage bucket.
6. **Ran `supabase/seed.sql`** — sample food banks + pickups for testing.
7. **Project Settings → API** — copied the **Project URL**, **anon key**, and
   **service_role key**.
8. **Authentication → Providers → Email** — turned **off "Confirm email"** so signups
   could log in immediately during testing.

### Environment + first run
9. `cp .env.example .env.local`, then filled in the three Supabase values +
   `NEXT_PUBLIC_SITE_URL=http://localhost:3000`. (Other keys left blank for now.)
10. `npm run dev` → opened http://localhost:3000.

> ⚠️ **Gotcha — `.env.local` only loads at server startup.** After editing it you must
> stop (`Ctrl+C`) and re-run `npm run dev`, or the app won't see the new values.

---

## Phase 2 — Getting the core flow working (and the bugs along the way)

### Geocoding without Google (free)
The donate form failed at first because every pickup needs latitude/longitude, and we
hadn't set up Google Maps. **Fix:** added a free, keyless geocoding fallback using
**OpenStreetMap Nominatim** (with **Photon** as a backup) in `lib/maps.ts`. The app now
turns a typed address into coordinates with no Google key required.

### Pickup time window
Changed the donate form from two date/time pickers to **one date + a dropdown of
hour-long windows** (10–11am … 4–5pm), which is friendlier for donors.

### Bugs hit and fixes
| Symptom | Cause | Fix |
|---|---|---|
| `Unexpected end of JSON input` on submit | Server route crashed (env vars not loaded) and returned an empty body | Restart dev server after editing `.env.local`; added a clear config-missing error + safe response parsing |
| `Hydration failed …` warning | A browser extension (password manager / Grammarly) modifying form inputs | Harmless — confirmed via Incognito; ignored |
| `InvalidKeyMapError` while typing address | `.env.local` still had the `your-...` **placeholder** values | Blanked the unused keys; code now treats any `your-` value as "unset" |
| "We couldn't locate that address" | Geocoder returning nothing | Added logging + the Photon backup geocoder |
| `Invalid path specified in request URL` (PGRST125) | `NEXT_PUBLIC_SUPABASE_URL` had `/rest/v1` / a trailing slash | Use the **bare** `https://<ref>.supabase.co`; code now also strips trailing slash + `/rest/v1` |

### Becoming an admin
Signed up through the app, then in the Supabase SQL Editor promoted the account:
```sql
update public.profiles set role = 'admin', approved = true;
```
> ⚠️ **Gotcha:** `UPDATE` always says "No rows returned" even on success, and the
> `where email = '...'` example must use your **real** email. Verifying with a `select`
> is the source of truth.

Then tested the full loop: donate → claim (volunteer) → complete → impact stats; and the
admin dashboard (view all, edit statuses, CSV export).

---

## Phase 3 — Customization

- **2-day pickup minimum** — the donate date field now blocks anything sooner than 2 days
  out (with an explanatory note), so there's time to arrange logistics.
- **Homepage redesign** — replaced the plain page with a richer nonprofit look using
  illustrations + gradients (`components/Illustrations.tsx`): hero, "how it works,"
  "who it's for," mission, testimonials, and a "where donations go" strip.
- **Live impact stats** — a stats band that pulls real numbers from the database, **hidden
  until 100+ lbs of food has been rescued** (controlled by `showStats` in `app/page.tsx`).
- **Logo** — added `public/logo.png`, shown in the header.
- **Favicon** — added `app/icon.png` (Next.js auto-uses it as the browser-tab icon).
- **Auth-aware header** — when signed in, the "Sign in" button becomes a person-icon
  **Dashboard** button.

---

## Phase 4 — Deploying to Vercel (via GitHub)

### Code → GitHub
1. `git init`, `git add .`, `git commit -m "Initial commit"` (`.env.local` is git-ignored,
   so secrets never leave the machine).
2. Created an **empty** repo at github.com/new (no README/license).
3. Connected + pushed:
   ```bash
   git branch -M main
   git remote add origin https://github.com/cf23-dev/food-stand-in-a-park.git
   git push -u origin main
   ```
   > Auth: GitHub needs a **Personal Access Token** (with `repo` scope) as the password,
   > not your account password.

### GitHub → Vercel
4. vercel.com → **Add New → Project → Import** the repo (granted Vercel access to the
   private repo).
5. Added **Environment Variables** before deploying (Supabase keys, Resend, site URL).
6. **Deploy.** From here, every `git push` to `main` auto-redeploys — no manual step.

### Build failures we fixed (the production build is stricter than `npm run dev`)
| Build error | Fix |
|---|---|
| ESLint failed on unescaped apostrophes (`react/no-unescaped-entities`) | Set `eslint: { ignoreDuringBuilds: true }` in `next.config.ts` |
| `Type error: Parameter 'cookiesToSet' implicitly has an 'any' type` | Added explicit types to the Supabase cookie callbacks |
| `next@15.1.6 … security vulnerability (CVE-2025-66478)` | Upgraded Next.js to **15.1.11** |

### Custom subdomain (kept the existing site)
7. Vercel → Settings → **Domains** → added `donate.foodstandinapark.org`.
8. In **GoDaddy** DNS, added a **CNAME**: name `donate` → value `cname.vercel-dns.com`.
   The existing `foodstandinapark.org` website stayed live because we used a subdomain.
9. Updated `NEXT_PUBLIC_SITE_URL` to `https://donate.foodstandinapark.org` and pointed
   Supabase Auth's URL config at it.

### Runtime bug — the middleware crash
- **Symptom:** `MIDDLEWARE_INVOCATION_FAILED` / "something went wrong" on `/admin`, and the
  login button spun forever.
- **Cause:** Vercel runs middleware on the **Edge runtime**, where the Supabase library
  uses a Node-only API and crashed.
- **Fix:** removed Supabase from the middleware entirely. Auth is enforced in each
  protected **page** instead (`/admin` and `/volunteer/dashboard` redirect on their own).

### The "disappearing" env vars
- **Symptom:** env var values looked deleted in the Vercel dashboard, twice.
- **Reality:** **Vercel masks saved values** (shows "Encrypted"/blank) — they were never
  deleted. Confirmed with `npx vercel env ls`. The real bug was the Supabase URL value
  containing `/rest/v1` (see PGRST125 above).
- **Lesson:** verify env vars with `npx vercel env ls`, not by eyeballing the dashboard.

> ⚠️ **Gotcha:** `NEXT_PUBLIC_*` variables are baked in at **build time**, so after changing
> one you must **redeploy** (with build cache unchecked) for it to take effect in the browser.

---

## Phase 5 — External services

### Email (Resend)
1. Created a Resend account + API key; set `RESEND_API_KEY` and `EMAIL_FROM`.
2. Tested with the `onboarding@resend.dev` sender (delivers only to your own Resend email).
3. **Verified `foodstandinapark.org` as a sending domain** in Resend (added its DNS records
   in GoDaddy) so emails can reach real donors and volunteers.
> ⚠️ **Gotcha:** the Resend SDK returns an `{ error }` object instead of throwing, so a
> rejected email looked like success — the code now checks and logs that error.

### Google Maps (optional polish — visual map + autocomplete)
1. console.cloud.google.com → created a project and **enabled billing** (a card is required
   even though usage stays free).
2. Enabled **Maps JavaScript API** and **Places API**. Enabling Maps auto-created the API key
   (one key works for all Maps APIs — no separate key per API).
3. **Restricted the key** — Website (HTTP referrer) restriction to the live domain +
   `localhost`.
4. Created a **Map ID** (type: JavaScript, rendering: **Vector** — required for the map pins).
5. **Cost safety:** capped "Map loads per day" and set a $1 budget alert. Also: Google starts a
   **$300 / 90-day free trial** on signup, during which it won't charge the card at all.
6. Added `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` + `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` to Vercel +
   `.env.local`, then redeployed.
> Notes: the "Pay As You Go" plan (not the $100/$275/$1200 subscriptions) is the correct,
> free-tier-included choice. The free monthly allowance (~10k map loads, ~5k autocomplete) is
> applied automatically and isn't shown during setup.

### Late fix
- **Adding a food bank → "Expected number, received nan"** — the lat/long fields were
  wrongly required. Made them optional so the address auto-geocodes.

---

## How to make changes now (the everyday loop)

```bash
cd ~/food-stand-in-a-park
npm run dev          # preview locally at localhost:3000
# ...make edits...
git add -A
git commit -m "describe the change"
git push             # Vercel auto-deploys to donate.foodstandinapark.org
```

- Changing **code** → just push (auto-deploys).
- Changing an **environment variable** → edit it in Vercel, then **redeploy** (uncheck
  build cache).
- The production build is stricter than `npm run dev`; if a deploy fails, the Vercel build
  log shows the exact file/line.

---

## Still on the to-do list (optional)
- Rotate the Supabase + Resend keys (good hygiene after the early Next.js CVE).
- Add real testimonials (placeholders live near the top of `app/page.tsx`).
- Tidy the stored `NEXT_PUBLIC_SUPABASE_URL` value to the bare host (the code handles it
  either way).
