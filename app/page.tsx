import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Food Stand in a Park — Ending hunger, one food stand at a time",
  description: "A student-led nonprofit reducing hunger and food waste through community food stands, youth leadership, and local partnerships. Join our mission.",
  openGraph: {
    title: "Food Stand in a Park — Ending hunger, one food stand at a time",
    description: "Student-led. Community-powered. Helping surplus food reach people who need it while inspiring the next generation of community leaders.",
    images: [{ url: "/community/park-food-drive.jpg", width: 2320, height: 1740, alt: "A Food Stand in a Park community food collection" }],
    type: "website",
  },
};

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
    if (banksRes.error || completedRes.error || volRes.error) {
      throw new Error("Impact data is unavailable.");
    }
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

const opportunities = [
  {
    number: "01",
    title: "Start a food stand",
    body: "Bring your neighbors together to collect food. We'll help you organize a stand in your community and grow your confidence as a leader.",
    links: [{ href: "/volunteer/dashboard?tab=food-stand", label: "Start a stand" }],
  },
  {
    number: "02",
    title: "Volunteer your time",
    body: "Turn a little of your time into something meaningful. Help collect food and deliver it to local food banks and pantries.",
    links: [{ href: "/volunteer/dashboard", label: "Explore volunteering" }],
  },
  {
    number: "03",
    title: "Give what you can",
    body: "Share food you won't use or help fund our community outreach. Every contribution helps connect good food with people who need it.",
    links: [{ href: "/donate", label: "Donate food" }, { href: "/support-us", label: "Support our work" }],
  },
];

export default async function HomePage() {
  const stats = await getStats();
  // These figures cover the pickup program, not the nonprofit's full history.
  const showStats = stats.pounds >= 100;

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-10 sm:pb-16 sm:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="animate-rise lg:col-span-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-800">Student-led. Community-powered. Since 2021.</p>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-balance text-brand-700 sm:text-5xl">
              Ending hunger,{" "}<span className="whitespace-nowrap">one food stand</span>{" "}at a time
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-gray-600">
              We bring neighbors together to share food, reduce waste, and help young people become leaders in their communities.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#get-involved" className="btn-primary px-6 py-3 text-base">Get involved</a>
              <Link href="/about" className="btn-secondary px-6 py-3 text-base">Our story</Link>
            </div>
          </div>
          <figure className="animate-rise lg:col-span-7" style={{ animationDelay: "100ms" }}>
            <Image src="/community/park-food-drive.jpg" alt="Food collection tables at a park, with donated groceries and a handmade Food Stand in a Park sign" width={2320} height={1740} priority sizes="(min-width: 1200px) 640px, (min-width: 1024px) 55vw, 100vw" className="aspect-[4/3] w-full rounded-xl object-cover" />
          </figure>
        </div>
      </section>

      <section className="bg-brand-50" aria-labelledby="mission-heading">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:py-16 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <h2 id="mission-heading" className="text-3xl font-bold tracking-tight text-balance">Less hunger.<br />Less waste.<br /><span className="text-brand-800">More young leaders.</span></h2>
          </div>
          <div className="lg:col-span-7">
            <p className="text-lg leading-relaxed text-pretty text-gray-700">
              Food Stand in a Park is a student-led nonprofit organization dedicated to reducing hunger and food waste by empowering young people to organize community food collection stands.
            </p>
            <p className="mt-4 leading-relaxed text-pretty text-gray-600">
              Our mission is to inspire youth leadership, strengthen communities, and ensure that surplus food reaches hungry individuals instead of going to waste.
            </p>
            <Link href="/about" className="mt-5 inline-flex min-h-11 items-center gap-2 font-semibold text-brand-800 hover:underline">Learn about our mission <span aria-hidden="true">→</span></Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20" aria-labelledby="story-heading">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <figure>
            <Image src="/community/food-stand.jpg" alt="A handmade yellow Food Stand in a Park banner in front of collection boxes labeled for rice, pasta, beans, and canned food" width={1066} height={800} sizes="(min-width: 1200px) 550px, (min-width: 1024px) 50vw, 100vw" className="aspect-[4/3] w-full rounded-xl object-cover" />
          </figure>
          <div>
            <h2 id="story-heading" className="text-3xl font-bold tracking-tight text-balance">It started with students who saw a way to help.</h2>
            <p className="mt-5 leading-relaxed text-pretty text-gray-600">
              In 2021, our student founders noticed that some families had food to spare while others were going hungry. They created Food Stand in a Park to build a bridge between them.
            </p>
            <p className="mt-4 leading-relaxed text-pretty text-gray-600">
              Today, that same idea guides our work: bring people together, collect food that would otherwise go unused, and get it to those who need it. Along the way, students learn to plan, organize, and lead a project that matters to their community.
            </p>
            <Link href="/about" className="mt-5 inline-flex min-h-11 items-center gap-2 font-semibold text-brand-700 hover:underline">Read our story <span aria-hidden="true">→</span></Link>
          </div>
        </div>
      </section>

      <section id="get-involved" className="scroll-mt-44 border-y border-gray-200 lg:scroll-mt-24" aria-labelledby="involved-heading">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="grid gap-5 lg:grid-cols-2 lg:gap-16">
            <h2 id="involved-heading" className="text-3xl font-bold tracking-tight text-balance">There's a place for you here.</h2>
            <p className="max-w-xl leading-relaxed text-gray-600">Whether you want to lead a food stand, lend a hand, or give what you can, you can help build a community where good food is shared.</p>
          </div>
          <div className="mt-10">
            {opportunities.map(opportunity => (
              <article key={opportunity.number} className="grid gap-4 border-t border-gray-200 py-8 sm:grid-cols-12 sm:gap-6">
                <span className="text-sm font-semibold text-brand-800 sm:col-span-1" aria-hidden="true">{opportunity.number}</span>
                <h3 className="text-xl font-semibold text-balance sm:col-span-4">{opportunity.title}</h3>
                <div className="sm:col-span-7">
                  <p className="max-w-xl leading-relaxed text-gray-600">{opportunity.body}</p>
                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
                    {opportunity.links.map(link => <Link key={link.href} href={link.href} className="inline-flex min-h-11 items-center gap-2 font-semibold text-brand-700 hover:underline">{link.label}<span aria-hidden="true">→</span></Link>)}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20" aria-labelledby="community-heading">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <h2 id="community-heading" className="text-3xl font-bold tracking-tight text-balance">Local food.<br />Shared with care.</h2>
          </div>
          <div className="lg:col-span-7">
            <p className="leading-relaxed text-pretty text-gray-600">Our food stands and volunteer pickups connect community generosity with the soup kitchens and food pantries that serve our neighbors. Together, we help surplus food reach people instead of going to waste.</p>
            {stats.foodBankNames.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-900">Food banks in our pickup network</h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {stats.foodBankNames.map(name => <li key={name} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">{name}</li>)}
                </ul>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1">
              <Link href="/food-banks" className="inline-flex min-h-11 items-center gap-2 font-semibold text-brand-700 hover:underline">Explore the food bank directory <span aria-hidden="true">→</span></Link>
              <a href="/community/partner-letter.png" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-brand-700 hover:underline">A note from a food pantry partner <span className="sr-only">(opens in a new tab)</span><span aria-hidden="true">↗</span></a>
            </div>
          </div>
        </div>
        {showStats && (
          <div className="mt-12 border-t border-gray-200 pt-8">
            <h3 className="text-lg font-semibold">Our pickup program's impact</h3>
            <p className="mt-2 text-sm text-gray-600">Recorded through our volunteer pickup platform.</p>
            <dl className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
              <Stat value={stats.pounds.toLocaleString()} label="Pounds of food rescued" />
              <Stat value={stats.pickups.toLocaleString()} label="Pickups completed" />
              <Stat value={stats.volunteers.toLocaleString()} label="Approved volunteers" />
              <Stat value={stats.foodBanks.toLocaleString()} label="Food banks in the network" />
            </dl>
          </div>
        )}
      </section>

      <section className="bg-brand-800">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-4 py-14 sm:py-16 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <h2 className="text-3xl font-bold tracking-tight text-balance text-white">Help build a stronger, more caring community.</h2>
            <p className="mt-4 leading-relaxed text-brand-100">One stand, one volunteer, one neighbor at a time. Join us in making good food go further.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/volunteer/dashboard" className="btn bg-white px-6 py-3 text-base text-brand-800 hover:bg-brand-50">Volunteer with us</Link>
            <Link href="/support-us" className="btn border border-white px-6 py-3 text-base text-white hover:bg-white/10">Support our work</Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="text-sm text-gray-600">{label}</dt>
      <dd className="mt-2 text-3xl font-extrabold text-brand-800">{value}</dd>
    </div>
  );
}
