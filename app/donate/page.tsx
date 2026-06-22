import type { Metadata } from "next";
import { DonationForm } from "@/components/DonationForm";

export const metadata: Metadata = {
  title: "Donate food — Food Stand in a Park",
  description: "Submit a food donation pickup request in about two minutes.",
};

export default function DonatePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900">Donate food</h1>
      <p className="mt-2 text-gray-600">
        Tell us what you have and where to pick it up. A nearby volunteer will
        claim your donation and deliver it to a local food bank.
      </p>
      <div className="card mt-8">
        <DonationForm />
      </div>
    </div>
  );
}
