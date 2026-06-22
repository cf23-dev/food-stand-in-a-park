import type { PickupStatus } from "@/lib/types";

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center gap-2 text-sm text-gray-600">
      <svg className="h-4 w-4 animate-spin text-brand-600" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      {label}…
    </span>
  );
}

const STATUS_STYLES: Record<PickupStatus, string> = {
  open: "bg-blue-100 text-blue-800",
  claimed: "bg-amber-100 text-amber-800",
  completed: "bg-brand-100 text-brand-800",
  cancelled: "bg-gray-200 text-gray-700",
};

export function StatusBadge({ status }: { status: PickupStatus }) {
  return (
    <span className={`badge ${STATUS_STYLES[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function Alert({
  kind = "error",
  children,
}: {
  kind?: "error" | "success" | "info";
  children: React.ReactNode;
}) {
  const styles = {
    error: "border-red-200 bg-red-50 text-red-800",
    success: "border-brand-200 bg-brand-50 text-brand-800",
    info: "border-blue-200 bg-blue-50 text-blue-800",
  }[kind];
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm ${styles}`}>
      {children}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center">
      <p className="font-medium text-gray-900">{title}</p>
      {body && <p className="mt-1 text-sm text-gray-600">{body}</p>}
    </div>
  );
}
