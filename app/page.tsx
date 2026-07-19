import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import {
  HeroArt,
  MissionArt,
  IconClipboard,
  IconRoute,
  IconBasket,
  IconBox,
  IconHandHeart,
  IconBuilding,
} from "@/components/Illustrations";

export const dynamic = "force-dynamic";

interface HomeStats {
  foodBanks: number;
  pickups: number;
  pounds: number;
  volunteers: number;
  foodBankNames: string[];
}

// Live impact numbers. Wrapped so the public homepage never crashes if the DB
// is briefly unreachable — it just falls back to zeros.
async function getStats(): Promise<HomeStats> {
  try {
    const supabase = createAdminClient();
    const [banksRes, completedRes, volRes] = await Promise.all([
      supabase.from("food_banks").select("name", { count: "exact" }).order("name"),
      supabase.from("pickup_requests").select("quantity_lbs", { count: "exact" }).eq("status", "completed"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "volunteer").eq("approved", true),
    ]);
    const pounds = (completedRes.data ?? []).reduce(
      (sum: number, r: { quantity_lbs: number | null }) => sum + (r.quantity_lbs ?? 0),
      0
    );
    return {
      foodBanks: banksRes.count ?? banksRes.data?.length ?? 0,
      pickups: completedRes.count ?? 0,
      pounds: Math.round(pounds),
      volunteers: volRes.count ?? 0,
      foodBankNames: (banksRes.data ?? []).map((b: { name: string }) => b.name),
    };
  } catch {
    return { foodBanks: 0, pickups: 0, pounds: 0, volunteers: 0, foodBankNames: [] };
  }
}

const steps = [
  {
    title: "Submit a pickup",
    body: "Have extra food? Fill out a 2-minute form with your address, what you're donating, and a pickup window.",
    Icon: IconClipboard,
  },
  {
    title: "A volunteer claims it",
    body: "Nearby volunteers are notified and claim your pickup. You'll get an email the moment one accepts.",
    Icon: IconRoute,
  },
  {
    title: "It reaches a food bank",
    body: "The volunteer delivers your donation to the nearest food bank and logs the impact — no food wasted.",
    Icon: IconBasket,
  },
];

const audiences = [
  {
    title: "Donors",
    body: "Residents, cafés, and offices with surplus food. Free, no account needed — just submit a pickup.",
    Icon: IconBox,
    href: "/donate",
    cta: "Donate food",
  },
  {
    title: "Volunteers",
    body: "Drivers who claim nearby pickups and deliver them to food banks, tracking their real-world impact.",
    Icon: IconHandHeart,
    href: "/volunteer/signup",
    cta: "Become a volunteer",
  },
  {
    title: "Food banks",
    body: "Local organizations that receive the donations we route to them — more food for the people they serve.",
    Icon: IconBuilding,
    href: "/food-banks",
    cta: "See the directory",
  },
];

export default async function HomePage() {
  const stats = await getStats();
  // Show the impact band only once it looks meaningful — i.e. once at least
  // 100 lbs of food has been rescued. Change the threshold (or the metric)
  // here to tune when it appears.
  const showStats = stats.pounds >= 100;

  return (
    <>
      {/* ─── Hero ─────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:py-24 lg:grid-cols-2">
          <div className="animate-rise">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-balance text-gray-900 sm:text-5xl">
              Donating food should be as easy as{" "}
              <span className="text-brand-700">a text message</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-gray-600">
              Food Stand in a Park connects neighbors with extra food to volunteers
              who deliver it to local food banks. No food wasted, more people fed.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/donate" className="btn-primary px-6 py-3 text-base">Donate food</Link>
              <Link href="/volunteer/signup" className="btn-secondary px-6 py-3 text-base">Become a volunteer</Link>
            </div>
            <p className="mt-6 text-sm text-gray-600">
              100% volunteer-run · Free for donors · About two minutes
            </p>
          </div>
          <div className="animate-rise" style={{ animationDelay: "120ms" }}>
            <HeroArt className="mx-auto w-full max-w-md" />
          </div>
        </div>
      </section>

      {/* ─── Impact stats (hidden until there's real activity) ──────── */}
      {showStats && (
        <section className="border-y border-gray-100 bg-white">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-12 sm:grid-cols-4">
            <Stat value={stats.pounds.toLocaleString()} label="Pounds of food rescued" />
            <Stat value={stats.pickups.toLocaleString()} label="Pickups completed" />
            <Stat value={stats.volunteers.toLocaleString()} label="Active volunteers" />
            <Stat value={stats.foodBanks.toLocaleString()} label="Partner food banks" />
          </div>
        </section>
      )}

      {/* ─── How it works ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <SectionHeading
          title="Three steps from surplus to served"
          sub="From a neighbor's kitchen to a food bank's shelves, in one simple handoff."
        />
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="relative text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <s.Icon className="h-8 w-8" />
              </div>
              <div className="mx-auto mt-4 flex items-center justify-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">{i + 1}</span>
                <h3 className="font-semibold text-gray-900">{s.title}</h3>
              </div>
              <p className="mt-2 text-pretty text-sm text-gray-600">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Who it's for ─────────────────────────────────────────── */}
      <section className="bg-brand-50/60">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <SectionHeading
            title="Everyone has a part to play"
            sub="Donors, volunteers, and food banks — each doing one thing well."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {audiences.map((a) => (
              <div
                key={a.title}
                className="card group relative flex flex-col transition-colors hover:border-brand-300"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <a.Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{a.title}</h3>
                <p className="mt-2 flex-1 text-pretty text-sm text-gray-600">{a.body}</p>
                <Link
                  href={a.href}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 after:absolute after:inset-0 group-hover:underline"
                >
                  {a.cta}
                  <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Mission / story ──────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <MissionArt className="order-2 mx-auto w-full max-w-sm lg:order-1" />
          <div className="order-1 lg:order-2">
            <h2 className="text-3xl font-bold tracking-tight text-balance text-gray-900">Good food shouldn't go to waste while neighbors go hungry</h2>
            <p className="mt-5 text-pretty leading-relaxed text-gray-600">
              Roughly a third of all food in the U.S. is thrown away, even as millions
              of families struggle to put meals on the table. The gap usually comes down
              to one thing: getting surplus food from where it is to where it's needed.
            </p>
            <p className="mt-4 text-pretty leading-relaxed text-gray-600">
              We close that gap with a simple network of neighbors and volunteers. Every
              pickup keeps good food out of the landfill and gets it onto someone's plate.
            </p>
            <Link href="/donate" className="btn-primary mt-6 inline-flex">Start a donation</Link>
          </div>
        </div>
      </section>

      {/* ─── Where donations go ───────────────────────────────────── */}
      {stats.foodBankNames.length > 0 && (
        <section className="mx-auto max-w-6xl border-t border-gray-100 px-4 py-20">
          <SectionHeading title="Food banks we deliver to" />
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {stats.foodBankNames.map((name) => (
              <span key={name} className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm">
                {name}
              </span>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/food-banks" className="text-sm font-semibold text-brand-700 hover:underline">
              View the full directory →
            </Link>
          </div>
        </section>
      )}

      {/* ─── Final CTA ────────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-brand-700 to-brand-800">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-5 px-4 py-20 text-center text-white">
          <h2 className="text-3xl font-bold tracking-tight text-balance">Ready to keep good food out of the trash?</h2>
          <p className="max-w-xl text-pretty text-brand-100">
            It takes about two minutes to submit a pickup — and a volunteer takes it from there.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/donate" className="btn bg-white px-6 py-3 text-base text-brand-800 hover:bg-brand-50">
              Donate food
            </Link>
            <Link href="/volunteer/signup" className="btn border border-white/60 px-6 py-3 text-base text-white hover:bg-white/10">
              Become a volunteer
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-extrabold text-brand-700 sm:text-4xl">{value}</div>
      <div className="mt-1 text-sm text-gray-600">{label}</div>
    </div>
  );
}

function SectionHeading({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="text-3xl font-bold tracking-tight text-balance text-gray-900">{title}</h2>
      {sub && <p className="mt-3 text-pretty text-gray-600">{sub}</p>}
    </div>
  );
}
