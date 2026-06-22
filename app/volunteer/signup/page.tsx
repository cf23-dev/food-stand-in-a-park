"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Alert, Spinner } from "@/components/ui";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    const password = String(fd.get("password"));
    const name = String(fd.get("name"));
    const address = String(fd.get("address"));

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role: "volunteer" } },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Store base location (best effort) so notifications can target nearby pickups.
    if (address && data.session) {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address }),
      }).catch(() => {});
    }

    if (data.session) {
      router.push("/volunteer/dashboard");
      router.refresh();
    } else {
      // Email confirmation is enabled on the Supabase project.
      setNotice("Check your email to confirm your account, then sign in.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-900">Become a volunteer</h1>
      <p className="mt-2 text-gray-600">
        Sign up to claim pickups near you. An admin approves new volunteers before
        you can start.
      </p>
      <form onSubmit={onSubmit} className="card mt-8 space-y-4">
        {error && <Alert kind="error">{error}</Alert>}
        {notice && <Alert kind="success">{notice}</Alert>}
        <div>
          <label htmlFor="name" className="label">Full name</label>
          <input id="name" name="name" className="input" required autoComplete="name" />
        </div>
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" name="email" type="email" className="input" required autoComplete="email" />
        </div>
        <div>
          <label htmlFor="password" className="label">Password</label>
          <input id="password" name="password" type="password" className="input" required minLength={8} autoComplete="new-password" />
          <p className="mt-1 text-xs text-gray-500">At least 8 characters.</p>
        </div>
        <div>
          <label htmlFor="address" className="label">Home area / ZIP (optional)</label>
          <input id="address" name="address" className="input" placeholder="So we can notify you about nearby pickups" autoComplete="postal-code" />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? <Spinner label="Creating account" /> : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/volunteer/login" className="font-medium text-brand-700 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
