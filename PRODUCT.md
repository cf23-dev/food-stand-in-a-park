# Product

## Register

product

> **Split-surface note.** This codebase has one true brand surface — the public
> marketing landing page (`app/page.tsx`) whose job is to persuade donors and
> volunteers to sign up. Treat that page (and other public, pre-signup pages like
> `/food-banks`) with the **brand** register: design IS the pitch there. Everything
> behind the action — the donor form, volunteer dashboard, admin — is **product**:
> design SERVES the task, and earned familiarity beats novelty. When a command
> targets the landing page, read `reference/brand.md`; for the app surfaces, the
> default `product` register holds.

## Users

Three distinct audiences, all non-technical and often on mobile:

- **Donors** — residents, cafés, and offices with surplus food. Anonymous, no
  account. Context: a spare two minutes, often at the end of a workday, wanting to
  do the right thing with food that would otherwise be thrown out. Job: report
  what they have and where, and trust that someone will come get it.
- **Volunteers** — drivers who claim nearby pickups and deliver them to food
  banks. Context: on the go, checking a map on a phone between errands, sometimes
  in a hurry. Job: find a nearby pickup, claim it, deliver, and see the impact
  they've had. Motivation is intrinsic — they want to feel their time mattered.
- **Admins** — the small volunteer team running the operation. Context: at a
  desk, managing volunteers, pickups, and food banks, exporting data for
  reporting. Job: keep the network healthy and accountable with minimal friction.

Assume varied devices, some older or low-bandwidth, and a range of digital
comfort. Nobody should need instructions to complete their task.

## Product Purpose

Food Stand in a Park coordinates food-donation pickups between community donors
and volunteers, routing surplus food to nearby food banks. Roughly a third of
U.S. food is wasted while families go hungry; the gap is usually logistics —
getting surplus from where it is to where it's needed. This product closes that
gap with a lightweight network: donors post, volunteers claim, food banks
receive.

Success looks like: a donor completes a pickup request in under two minutes and
never wonders what happened next; a volunteer opens the map and immediately sees
what's claimable near them; an admin runs the whole operation without a spreadsheet.
The product should feel like infrastructure the community trusts — dependable
enough that people come back, humane enough that they want to.

## Brand Personality

**Warm · trustworthy · dependable.**

Voice is that of a helpful neighbor, not a brand or a bureaucracy: plain-spoken,
concrete, encouraging without being saccharine. It respects the user's time and
never oversells. Copy leads with the human outcome ("more people fed, no food
wasted"), not features or metrics.

Emotionally, the interface should make people feel it's *safe and easy to hand
over their food or their time* — low friction, no surprises, quietly competent.
Warmth is carried by tone, typography, and the human details, not by decoration
or gimmicks.

## Anti-references

- **The generic charity template.** Stock-photo smiling volunteers, "DONATE NOW"
  in alarm-red, cluttered nonprofit-WordPress layouts, guilt-driven urgency. This
  product earns trust through clarity and follow-through, not emotional pressure.
- **Corporate SaaS.** Cold blue-gradient heroes, the big-number hero-metric
  template, enterprise dashboards, buzzword marketing. This is a community tool,
  not a B2B product; it should feel human and local, not venture-funded.
- Avoid the cross-register AI tells regardless of surface: gradient headline text,
  an eyebrow above every section, identical icon-card grids, decorative
  glassmorphism. (The current landing page uses several of these — flag for a
  future pass, don't treat them as established brand.)

## Design Principles

1. **The task disappears.** Every screen has one obvious primary action. A donor,
   volunteer, or admin should finish their job without stopping to figure out the
   interface. Familiar affordances over clever ones.
2. **Trust is built by follow-through, not persuasion.** Confirmations, status,
   and "what happens next" are first-class. Never leave someone wondering whether
   their action worked — especially the anonymous donor who can't log back in.
3. **Warmth lives in the details, not the decoration.** Human copy, considered
   empty states, and a genuine sense of impact carry the feeling. Resist
   decorative flourishes that don't serve the task.
4. **Works for everyone, everywhere.** Mobile-first, resilient on older and
   low-bandwidth devices, legible for non-native-English readers. The product
   degrades gracefully when a map or email service is unavailable.
5. **Show the impact honestly.** Real numbers, shown only once they're meaningful.
   No inflated metrics or vanity stats; the mission is the reward.

## Accessibility & Inclusion

Target **WCAG 2.1 AA**, with civic-tool emphasis beyond the baseline given the
audience (low-income, older, and varied-device users):

- Body text ≥ 4.5:1 contrast; large text ≥ 3:1; placeholders held to the same 4.5:1.
- Full keyboard operability with visible focus rings; skip link; correct ARIA
  (already scaffolded — maintain it).
- `prefers-reduced-motion` honored for every animation.
- Don't rely on color alone to convey pickup status; pair with text or icon.
- Low-bandwidth and older-device resilience: graceful degradation when Maps or
  email keys are absent (already an architectural principle — keep it).
- Plain, concrete language for non-native-English readers; avoid idiom and jargon
  in labels, errors, and instructions.
