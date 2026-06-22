"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Alert, Spinner } from "@/components/ui";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/volunteer/dashboard";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-900">Volunteer sign in</h1>
      <p className="mt-2 text-gray-600">Welcome back. Sign in to view and claim pickups.</p>
      <form onSubmit={onSubmit} className="card mt-8 space-y-4">
        {error && <Alert kind="error">{error}</Alert>}
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" name="email" type="email" className="input" required autoComplete="email" />
        </div>
        <div>
          <label htmlFor="password" className="label">Password</label>
          <input id="password" name="password" type="password" className="input" required autoComplete="current-password" />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? <Spinner label="Signing in" /> : "Sign in"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-600">
        New here?{" "}
        <Link href="/volunteer/signup" className="font-medium text-brand-700 hover:underline">
          Create a volunteer account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="px-4 py-16 text-center"><Spinner /></div>}>
      <LoginForm />
    </Suspense>
  );
}
