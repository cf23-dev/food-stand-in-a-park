import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-gray-600 sm:flex-row">
        <div className="text-center sm:text-left">
          <p>© {new Date().getFullYear()} Food Stand in a Park. A registered nonprofit organization.</p>
          <p className="mt-1">EIN: 88-3450553</p>
        </div>
        <nav className="flex flex-wrap justify-center gap-4" aria-label="Footer">
          <Link href="/about" className="hover:text-brand-700">About</Link>
          <Link href="/support-us" className="hover:text-brand-700">Support us</Link>
          <Link href="/donate" className="hover:text-brand-700">Donate</Link>
          <Link href="/food-banks" className="hover:text-brand-700">Food banks</Link>
          <Link href="/volunteer/signup" className="hover:text-brand-700">Volunteer</Link>
          <Link href="/admin" className="hover:text-brand-700">Admin</Link>
        </nav>
      </div>
    </footer>
  );
}
