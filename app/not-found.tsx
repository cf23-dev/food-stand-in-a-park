import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <div className="text-5xl" aria-hidden>🧺</div>
      <h1 className="mt-4 text-2xl font-bold text-gray-900">Page not found</h1>
      <p className="mt-2 text-gray-600">We couldn't find what you were looking for.</p>
      <Link href="/" className="btn-primary mt-6">Back home</Link>
    </div>
  );
}
