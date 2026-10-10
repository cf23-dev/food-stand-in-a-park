"use client";

import { useState } from "react";
import { Alert, Spinner } from "./ui";
import type { Profile } from "@/lib/types";

export function FoodStandOpportunity({ profile }: { profile: Profile | null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/food-stand-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fields.get("name"), age: Number(fields.get("age")),
          phone: fields.get("phone"), state_zip: fields.get("state_zip"),
          referral: fields.get("referral"), receive_updates: fields.get("receive_updates") === "on",
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not send your interest.");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your interest. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="max-w-3xl" aria-labelledby="food-stand-heading">
      <h2 id="food-stand-heading" className="text-2xl font-bold">Start a food stand in your community</h2>
      <p className="mt-3 leading-relaxed text-gray-600">
        Help young students gain confidence and organizational skills by setting up a food stand in your community. Fill out the form below to get started, and we&apos;ll work together to bring your food stand to life!
      </p>
      <p className="mt-3 text-sm text-gray-600">Our team will help you plan a food collection stand and connect donations with people who need them.</p>
      {sent ? (
        <div className="mt-6">
          <Alert kind="success">Your request has been saved for our team to review. We&apos;ll contact you at your account email to help you get started.</Alert>
        </div>
      ) : (
        <form onSubmit={submit} className="card mt-6 space-y-5">
          <p className="text-sm text-gray-600">Your details go to the Food Stand in a Park team. Required fields are marked with *.</p>
          {error && <Alert>{error}</Alert>}
          <fieldset disabled={busy} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div><label htmlFor="stand-name" className="label">Name *</label><input id="stand-name" name="name" autoComplete="name" defaultValue={profile?.name ?? ""} required maxLength={120} className="input" /></div>
              <div><label htmlFor="stand-age" className="label">Age *</label><input id="stand-age" name="age" type="number" min={1} max={120} step={1} required className="input" /></div>
              <div><label htmlFor="stand-email" className="label">Account email</label><input id="stand-email" type="email" value={profile?.email ?? ""} readOnly className="input bg-gray-50" /><p className="mt-1 text-xs text-gray-600">We&apos;ll reply to your signed-in account email.</p></div>
              <div><label htmlFor="stand-phone" className="label">Phone *</label><input id="stand-phone" name="phone" type="tel" autoComplete="tel" defaultValue={profile?.phone ?? ""} required minLength={7} maxLength={40} className="input" /></div>
            </div>
            <div><label htmlFor="stand-location" className="label">State &amp; ZIP code *</label><input id="stand-location" name="state_zip" placeholder="e.g. California, 95757" required minLength={3} maxLength={120} className="input" /></div>
            <div><label htmlFor="stand-referral" className="label">How did you hear about this opportunity?</label><textarea id="stand-referral" name="referral" rows={3} maxLength={2000} className="input" /></div>
            <label className="flex items-start gap-3 text-sm text-gray-700"><input type="checkbox" name="receive_updates" className="mt-1 h-4 w-4 accent-brand-700" /><span>Yes, I&apos;d like to receive updates on volunteer opportunities and upcoming events.</span></label>
            <button type="submit" className="btn-primary">{busy ? <Spinner label="Sending" /> : "Send my interest"}</button>
          </fieldset>
        </form>
      )}
      <p className="mt-5 text-sm text-gray-600">Questions? <a href="mailto:contact@foodstandinapark.org" className="font-medium text-brand-700 hover:underline">Email contact@foodstandinapark.org</a>.</p>
    </section>
  );
}
