import type { Metadata } from "next";
import { DonationForm } from "@/components/DonationForm";
import { IconClipboard, IconRoute, IconBasket } from "@/components/Illustrations";

export const metadata: Metadata = {
  title: "Donate food — Food Stand in a Park",
  description: "Submit a food donation pickup request in about two minutes.",
};

const nextSteps = [
  { Icon: IconClipboard, title: "We confirm your request", body: "You'll get an email confirmation right away, and your pickup goes live for volunteers." },
  { Icon: IconRoute, title: "A volunteer claims it", body: "We notify nearby volunteers. You'll hear the moment one accepts your pickup." },
  { Icon: IconBasket, title: "It reaches a food bank", body: "The volunteer collects your donation and delivers it to the nearest food bank." },
];

export default function DonatePage() {
  return (
    <div className="bg-gradient-to-b from-brand-50/60 to-white">
      <div className="mx-auto max-w-6xl px-4 py-12 lg:py-16">
        <div className="max-w-2xl">
          <span className="eyebrow">🥕 Donate food</span>
          <h1 className="mt-4 text-3xl font-bold text-gray-900 sm:text-4xl">Donate food in two minutes</h1>
          <p className="mt-2 text-gray-600">
            Tell us what you have and where to pick it up. A nearby volunteer will
            claim your donation and deliver it to a local food bank.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          {/* Form */}
          <div className="lg:col-span-2">
            <div className="card">
              <DonationForm />
            </div>
          </div>

          {/* Aside */}
          <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
            <div className="card">
              <h2 className="font-semibold text-gray-900">What happens after you submit</h2>
              <ol className="mt-4 space-y-4">
                {nextSteps.map((s, i) => (
                  <li key={s.title} className="flex gap-3">
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                      <s.Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {i + 1}. {s.title}
                      </p>
                      <p className="text-sm text-gray-600">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-xl border border-brand-200 bg-brand-50 p-5 text-sm text-brand-900">
              <p className="font-semibold">Free &amp; no account needed</p>
              <p className="mt-1 text-brand-800">
                Donating is completely free. We only use your details to coordinate the
                pickup and keep you updated by email.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
