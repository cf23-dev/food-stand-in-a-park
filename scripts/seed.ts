/**
 * Programmatic seeding alternative to supabase/seed.sql.
 * Usage: copy .env.local values into your shell, then `npm run seed`.
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const foodBanks = [
  { name: "Rainier Valley Food Bank", address: "4205 Rainier Ave S, Seattle, WA 98118", latitude: 47.571, longitude: -122.284, phone: "(206) 723-4105", website: "https://rvfb.org", hours: "Tue–Sat 10am–2pm", accepted_types: ["Produce", "Canned Goods", "Dairy", "Bread & Bakery"] },
  { name: "University District Food Bank", address: "5017 Roosevelt Way NE, Seattle, WA 98105", latitude: 47.666, longitude: -122.3175, phone: "(206) 523-7060", website: "https://udistrictfoodbank.org", hours: "Mon/Wed/Fri 11am–4pm", accepted_types: ["Produce", "Canned Goods", "Frozen", "Prepared Meals"] },
  { name: "Ballard Food Bank", address: "1400 NW Leary Way, Seattle, WA 98107", latitude: 47.661, longitude: -122.376, phone: "(206) 789-7800", website: "https://ballardfoodbank.org", hours: "Mon–Fri 9am–3pm", accepted_types: ["Produce", "Canned Goods", "Dairy", "Bread & Bakery", "Frozen"] },
];

const pickups = [
  { donor_name: "Maria Gonzalez", donor_email: "maria@example.com", donor_phone: "(206) 555-0142", address: "3200 Beacon Ave S, Seattle, WA 98144", latitude: 47.579, longitude: -122.311, food_type: "Produce", quantity: "4 boxes of vegetables", quantity_lbs: 40, notes: "Leave note at front desk.", status: "open" },
  { donor_name: "David Kim", donor_email: "david@example.com", address: "700 Pike St, Seattle, WA 98101", latitude: 47.612, longitude: -122.334, food_type: "Canned Goods", quantity: "~25 cans", quantity_lbs: 30, notes: "Office pantry cleanout.", status: "open" },
];

async function main() {
  console.log("Seeding food banks…");
  await supabase.from("food_banks").insert(foodBanks);
  console.log("Seeding pickup requests…");
  await supabase.from("pickup_requests").insert(pickups);
  console.log("Done. Promote yourself to admin with the SQL in supabase/seed.sql.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
