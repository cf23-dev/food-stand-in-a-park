"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Alert, Spinner } from "@/components/ui";

export default function FeedbackPage() {
  const params = useParams();
  const pickupId = String(params.id);

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (rating < 1) {
      setError("Please pick a star rating.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pickup_id: pickupId, rating, comment }),
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="text-5xl" aria-hidden>💚</div>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Thank you!</h1>
        <p className="mt-2 text-gray-600">
          Your feedback helps us get more good food to more people. We appreciate you.
        </p>
        <Link href="/donate" className="btn-primary mt-6">Donate again</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-900">How did it go?</h1>
      <p className="mt-2 text-gray-600">
        Your donation was delivered to a local food bank. We'd love your quick feedback —
        it's private and only seen by our team.
      </p>

      <form onSubmit={submit} className="card mt-8 space-y-5">
        {error && <Alert kind="error">{error}</Alert>}

        <div>
          <label className="label">Your rating</label>
          <div className="flex gap-1" role="radiogroup" aria-label="Star rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                aria-pressed={rating === n}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(n)}
                className="text-4xl leading-none transition"
              >
                <span className={(hover || rating) >= n ? "text-accent-500" : "text-gray-300"}>★</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="comment" className="label">Anything else? (optional)</label>
          <textarea
            id="comment"
            rows={4}
            className="input"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What went well, or what could be better?"
          />
        </div>

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? <Spinner label="Submitting" /> : "Submit feedback"}
        </button>
      </form>
    </div>
  );
}
