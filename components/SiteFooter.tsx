import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-gray-600 sm:flex-row">
        <p>© {new Date().getFullYear()} Food Stand in a Park. A community nonprofit.</p>
        <nav className="flex gap-4" aria-label="Footer">
          <Link href="/donate" className="hover:text-brand-700">Donate</Link>
          <Link href="/food-banks" className="hover:text-brand-700">Food banks</Link>
          <Link href="/volunteer/signup" className="hover:text-brand-700">Volunteer</Link>
          <Link href="/admin" className="hover:text-brand-700">Admin</Link>
        </nav>
      </div>
    </footer>
  );
}
