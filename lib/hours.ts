import { z } from "zod";

export const HOUR_STATUS_LABELS = {
  draft: "Draft", pending: "Awaiting signature", returned: "Needs changes", signed: "Signed",
} as const;
export type HourStatus = keyof typeof HOUR_STATUS_LABELS;
export type Signature = { kind: "drawn"; strokes: number[][][] } | { kind: "typed"; text: string };
export interface HourEntry {
  id: string;
  volunteer_id: string;
  volunteer_name: string;
  claim_id: string | null;
  service_date: string;
  duration_minutes: number;
  activity: string;
  notes: string;
  program: string;
  status: HourStatus;
  review_note: string | null;
  signer_id: string | null;
  signer_name: string | null;
  signer_title: string | null;
  signature: Signature | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
  version: number;
  claim?: { completed_at: string | null; pickup: { food_type: string; address: string } | null } | null;
}

// Store normalized vector strokes so signatures scale cleanly in printed records.
export const signatureSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("drawn"), strokes: z.array(z.array(z.tuple([
    z.number().finite().min(0).max(600), z.number().finite().min(0).max(200),
  ])).min(2, "Please draw your signature rather than tapping.").max(2000)).min(1, "Please draw your signature.").max(100) }),
  z.object({ kind: z.literal("typed"), text: z.string().trim().min(2).max(120) }),
]).refine(s => s.kind === "typed" || (s.strokes.reduce((n, stroke) => n + stroke.length, 0) <= 10000 &&
  s.strokes.some(stroke => stroke.some(p => Math.abs(p[0] - stroke[0][0]) >= 2 || Math.abs(p[1] - stroke[0][1]) >= 2))),
  "Please draw your signature.");
export function localDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
export function formatHours(minutes: number) {
  const hours = Math.floor(minutes / 60), remainder = minutes % 60;
  return `${hours}h${remainder ? ` ${remainder}m` : ""}`;
}
export function formatServiceDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString();
}
const fields = z.object({
  service_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(d => {
    const parsed = new Date(`${d}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === d;
  }, "Enter a valid service date."),
  duration_minutes: z.number().int().min(1, "Log at least one minute of service.").max(1440, "An entry cannot exceed 24 hours."),
  activity: z.string().trim().min(3, "Describe the service you performed.").max(200),
  notes: z.string().trim().max(2000).default(""),
  program: z.string().trim().max(200).default(""),
  claim_id: z.string().uuid().nullable().default(null),
});
const existing = { id: z.string().uuid(), version: z.number().int().positive() };
export const hourCommandSchema = z.discriminatedUnion("action", [
  fields.extend({ action: z.literal("create"), submit: z.boolean(), id: z.string().uuid() }),
  fields.extend({ action: z.literal("save"), submit: z.boolean(), ...existing }),
  z.object({ action: z.literal("request"), ...existing }),
  z.object({ action: z.literal("withdraw"), ...existing }),
  z.object({ action: z.literal("delete"), ...existing }),
  z.object({ action: z.literal("return"), ...existing, review_note: z.string().trim().min(3).max(2000) }),
  z.object({ action: z.literal("sign"), ...existing, signer_name: z.string().trim().min(2).max(120),
    signer_title: z.string().trim().min(2).max(120), signature: signatureSchema, confirmed: z.literal(true) }),
]);
