import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui";
import type { FoodBank } from "@/lib/types";

export const metadata: Metadata = {
  title: "Food bank directory — Food Stand in a Park",
};
export const dynamic = "force-dynamic";

export default async function FoodBanksPage() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("food_banks").select("*").order("name");
  const banks = (data as FoodBank[]) ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900">Food bank directory</h1>
      <p className="mt-2 text-gray-600">Local organizations that receive the donations we coordinate.</p>

      {banks.length === 0 ? (
        <div className="mt-8"><EmptyState title="No food banks listed yet" /></div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {banks.map((fb) => (
            <div key={fb.id} className="card">
              <h2 className="font-semibold text-gray-900">{fb.name}</h2>
              <p className="text-sm text-gray-600">{fb.address}</p>
              <dl className="mt-3 space-y-1 text-sm text-gray-700">
                {fb.phone && <div><dt className="inline text-gray-500">Phone: </dt><dd className="inline">{fb.phone}</dd></div>}
                {fb.hours && <div><dt className="inline text-gray-500">Hours: </dt><dd className="inline">{fb.hours}</dd></div>}
                {fb.website && (
                  <div>
                    <dt className="inline text-gray-500">Web: </dt>
                    <dd className="inline">
                      <a href={fb.website} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline">
                        {fb.website.replace(/^https?:\/\//, "")}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
              {fb.accepted_types.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {fb.accepted_types.map((t) => (
                    <span key={t} className="badge bg-brand-100 text-brand-800">{t}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
