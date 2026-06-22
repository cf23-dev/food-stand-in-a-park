import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
      <nav
        className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3"
        aria-label="Main"
      >
        <Link href="/" className="flex items-center gap-2 font-bold text-brand-800">
          {/* Your logo lives in /public/logo.png. h-8 keeps it header-sized;
              w-auto preserves its aspect ratio for any shape. */}
          <img src="/logo.png" alt="" className="h-8 w-auto" />
          <span>Food Stand in a Park</span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <Link href="/donate" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
            Donate
          </Link>
          <Link href="/food-banks" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 sm:block">
            Food banks
          </Link>
          <Link href="/volunteer/dashboard" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
            Volunteer
          </Link>
          <Link href="/volunteer/login" className="btn-primary px-3 py-2">
            Sign in
          </Link>
        </div>
      </nav>
    </header>
  );
}
