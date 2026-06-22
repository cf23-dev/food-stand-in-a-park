import Link from "next/link";

const steps = [
  {
    title: "Submit a pickup",
    body: "Have extra food? Fill out a 2-minute form with your address and what you're donating.",
    icon: "📝",
  },
  {
    title: "A volunteer claims it",
    body: "Nearby volunteers get notified and claim your pickup. You'll get an email when one accepts.",
    icon: "🚗",
  },
  {
    title: "It reaches a food bank",
    body: "The volunteer delivers your donation to the nearest food bank and logs the impact.",
    icon: "🥫",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-5xl px-4 py-20 text-center sm:py-28">
          <span className="badge bg-brand-100 text-brand-800">
            Community food rescue
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Donating food should be as easy as <span className="text-brand-700">a text message</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-600">
            Food Stand in a Park connects neighbors with extra food to volunteers
            who deliver it to local food banks. No food wasted, more people fed.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/donate" className="btn-primary w-full sm:w-auto">
              Donate food
            </Link>
            <Link href="/volunteer/signup" className="btn-secondary w-full sm:w-auto">
              Become a volunteer
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-center text-2xl font-bold text-gray-900">How it works</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="card text-center">
              <div className="text-4xl" aria-hidden>
                {s.icon}
              </div>
              <h3 className="mt-3 font-semibold text-gray-900">
                {i + 1}. {s.title}
              </h3>
              <p className="mt-2 text-sm text-gray-600">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-brand-700">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-12 text-center text-white sm:flex-row sm:justify-between sm:text-left">
          <div>
            <h2 className="text-xl font-bold">Ready to keep good food out of the trash?</h2>
            <p className="mt-1 text-brand-100">It takes about two minutes to submit a pickup.</p>
          </div>
          <Link
            href="/donate"
            className="btn bg-white text-brand-800 hover:bg-brand-50"
          >
            Start a donation
          </Link>
        </div>
      </section>
    </>
  );
}
