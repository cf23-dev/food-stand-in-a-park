import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import type { FoodBank, PickupRequest } from "@/lib/types";
import { directionsUrl } from "@/lib/geo";

export const dynamic = "force-dynamic";

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  let pickup: PickupRequest | null = null;
  let foodBank: FoodBank | null = null;

  if (id) {
    const supabase = createAdminClient();
    const { data } = await supabase.from("pickup_requests").select("*").eq("id", id).single();
    pickup = data as PickupRequest | null;
    if (pickup?.suggested_food_bank_id) {
      const { data: fb } = await supabase
        .from("food_banks")
        .select("*")
        .eq("id", pickup.suggested_food_bank_id)
        .single();
      foodBank = fb as FoodBank | null;
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <div className="text-5xl" aria-hidden>✅</div>
      <h1 className="mt-4 text-3xl font-bold text-gray-900">Donation submitted!</h1>
      <p className="mt-2 text-gray-600">
        Thanks{pickup ? `, ${pickup.donor_name}` : ""}! Your request is now <strong>open</strong> for
        volunteers. We've emailed you a confirmation and will let you know the moment a
        volunteer accepts.
      </p>

      {pickup && (
        <div className="card mt-8 text-left">
          <h2 className="font-semibold text-gray-900">Your pickup</h2>
          <dl className="mt-3 space-y-1 text-sm text-gray-700">
            <div className="flex justify-between gap-4"><dt className="text-gray-500">Food type</dt><dd>{pickup.food_type}</dd></div>
            {pickup.quantity && <div className="flex justify-between gap-4"><dt className="text-gray-500">Quantity</dt><dd>{pickup.quantity}</dd></div>}
            <div className="flex justify-between gap-4"><dt className="text-gray-500">Address</dt><dd className="text-right">{pickup.address}</dd></div>
          </dl>

          {foodBank && (
            <div className="mt-4 rounded-lg bg-brand-50 p-4 text-sm">
              <p className="font-medium text-brand-800">Suggested drop-off: {foodBank.name}</p>
              <p className="text-gray-600">{foodBank.address}</p>
              <a
                className="mt-1 inline-block text-brand-700 underline"
                href={directionsUrl(
                  { latitude: pickup.latitude, longitude: pickup.longitude },
                  { latitude: foodBank.latitude, longitude: foodBank.longitude }
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                View route on Google Maps
              </a>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 flex justify-center gap-3">
        <Link href="/donate" className="btn-secondary">Donate again</Link>
        <Link href="/" className="btn-primary">Back home</Link>
      </div>
    </div>
  );
}
