"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <div className="text-5xl" aria-hidden>😕</div>
      <h1 className="mt-4 text-2xl font-bold text-gray-900">Something went wrong</h1>
      <p className="mt-2 text-gray-600">An unexpected error occurred. Please try again.</p>
      <button onClick={reset} className="btn-primary mt-6">Try again</button>
    </div>
  );
}
