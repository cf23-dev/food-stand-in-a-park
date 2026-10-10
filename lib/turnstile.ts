import { z } from "zod";

const resultSchema = z.object({
  success: z.boolean(),
  action: z.string().optional(),
  "error-codes": z.array(z.string()).optional(),
});

type Verification =
  | { success: true }
  | { success: false; status: 400 | 503; error: string };

// Called only on the server, before geocoding, database writes, or emails.
export async function verifyPickupTurnstile(token: unknown): Promise<Verification> {
  if (typeof token !== "string" || !token.trim() || token.length > 2048) {
    return { success: false, status: 400, error: "Please complete the security check and try again." };
  }

  const unavailable: Verification = {
    success: false,
    status: 503,
    error: "The security check is temporarily unavailable. Please try again later.",
  };
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return unavailable;

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return unavailable;
    const parsed = resultSchema.safeParse(await response.json());
    if (!parsed.success) return unavailable;
    const result = parsed.data;
    if (result["error-codes"]?.some((code) =>
      ["internal-error", "missing-input-secret", "invalid-input-secret", "invalid-widget-id", "invalid-parsed-secret"].includes(code)
    )) return unavailable;

    // Prevent tokens from another form (such as signup) being reused here.
    if (!result.success || result.action !== "pickup_request") {
      return { success: false, status: 400, error: "The security check expired or failed. Please verify again and resubmit." };
    }
    return { success: true };
  } catch {
    return unavailable;
  }
}
