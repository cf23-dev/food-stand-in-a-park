-- ════════════════════════════════════════════════════════════════════════════
-- Seed data for local testing. Run AFTER schema.sql.
-- Coordinates are around Seattle, WA — swap for your own service area.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Food banks ───────────────────────────────────────────────────────────
insert into public.food_banks (name, address, latitude, longitude, phone, website, hours, accepted_types)
values
  ('Rainier Valley Food Bank', '4205 Rainier Ave S, Seattle, WA 98118', 47.5710, -122.2840,
   '(206) 723-4105', 'https://rvfb.org', 'Tue–Sat 10am–2pm',
   array['Produce','Canned Goods','Dairy','Bread & Bakery']),
  ('University District Food Bank', '5017 Roosevelt Way NE, Seattle, WA 98105', 47.6660, -122.3175,
   '(206) 523-7060', 'https://udistrictfoodbank.org', 'Mon/Wed/Fri 11am–4pm',
   array['Produce','Canned Goods','Frozen','Prepared Meals']),
  ('Ballard Food Bank', '1400 NW Leary Way, Seattle, WA 98107', 47.6610, -122.3760,
   '(206) 789-7800', 'https://ballardfoodbank.org', 'Mon–Fri 9am–3pm',
   array['Produce','Canned Goods','Dairy','Bread & Bakery','Frozen']),
  ('West Seattle Food Bank', '3419 SW Morgan St, Seattle, WA 98126', 47.5475, -122.3770,
   '(206) 932-9023', 'https://westseattlefoodbank.org', 'Tue–Thu 10am–2:45pm',
   array['Produce','Canned Goods','Prepared Meals'])
on conflict do nothing;

-- ─── Pickup requests (open) ─────────────────────────────────────────────────
insert into public.pickup_requests
  (donor_name, donor_email, donor_phone, address, latitude, longitude,
   food_type, quantity, quantity_lbs, notes, earliest_pickup, latest_pickup, status)
values
  ('Maria Gonzalez', 'maria@example.com', '(206) 555-0142',
   '3200 Beacon Ave S, Seattle, WA 98144', 47.5790, -122.3110,
   'Produce', '4 boxes of vegetables', 40,
   'Leave note at front desk; available after 2pm.',
   now() + interval '1 day', now() + interval '3 days', 'open'),
  ('David Kim', 'david@example.com', null,
   '700 Pike St, Seattle, WA 98101', 47.6120, -122.3340,
   'Canned Goods', '~25 cans', 30,
   'Office pantry cleanout.',
   now() + interval '2 hours', now() + interval '2 days', 'open'),
  ('Sarah Johnson', 'sarah@example.com', '(206) 555-0199',
   '5600 University Way NE, Seattle, WA 98105', 47.6685, -122.3130,
   'Bread & Bakery', '3 trays day-old bread', 18,
   'Café donation, pickup before close.',
   now(), now() + interval '1 day', 'open')
on conflict do nothing;

-- ─── Notes ──────────────────────────────────────────────────────────────────
-- To create test volunteers/admins, sign up through the app, then promote in SQL:
--   update public.profiles set role = 'admin', approved = true
--     where email = 'you@example.com';
--   update public.profiles set approved = true, latitude = 47.61, longitude = -122.33
--     where email = 'volunteer@example.com';
