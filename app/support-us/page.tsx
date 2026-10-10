import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support Us | Food Stand in a Park",
  description: "Support our community food collection work through PayPal, Zelle, or Venmo. Every dollar counts.",
};

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Support Us</h1>
        <h2 className="mt-8 text-2xl font-bold">Help Our Cause</h2>
        <p className="mt-4 leading-relaxed text-gray-600">
          Besides providing food to those in need, we also need your support by donating money to our non-profit. The money you donate will be used for printing fliers and post service. This way, we can spread the word to help people suffering from hunger. Help us reach our goal and support the hungry! Every dollar counts!
        </p>
        <a href="https://www.paypal.com/donate?business=foodstandinapark%40gmail.com&currency_code=USD" className="btn-primary mt-6">Donate with PayPal</a>
        <p className="mt-3 text-sm text-gray-600">Pay with PayPal or a debit/credit card.</p>
      </div>
      <section className="mt-12 border-t border-gray-200 pt-10" aria-labelledby="donation-methods">
        <h2 id="donation-methods" className="text-2xl font-bold">Ways to Donate</h2>
        <p className="mt-3 text-gray-600">Scan a QR code with your phone to donate through your preferred service.</p>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {["Zelle", "PayPal", "Venmo"].map((method) => (
            <article key={method} className="card text-center">
              <h3 className="text-xl font-semibold">{method}</h3>
              <img src={`/support/${method.toLowerCase()}.png`} alt={`Scan to donate to Food Stand in a Park with ${method}`} width={365} height={365} className="mx-auto mt-5 h-auto w-full max-w-64" />
            </article>
          ))}
        </div>
      </section>
      <div className="mt-10 rounded-xl bg-brand-50 p-6">
        <h2 className="text-lg font-semibold">Give food or volunteer your time</h2>
        <p className="mt-2 text-gray-600">You can also support your neighbors by donating surplus food or helping collect it.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/donate" className="btn-secondary">Donate food</Link>
          <Link href="/volunteer/dashboard" className="btn-secondary">Volunteer</Link>
        </div>
      </div>
    </div>
  );
}
