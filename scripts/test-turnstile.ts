import assert from "node:assert/strict";
import { verifyPickupTurnstile } from "../lib/turnstile";
import { POST } from "../app/api/pickups/route";

async function main() {
  const originalFetch = globalThis.fetch;
  const originalSecret = process.env.TURNSTILE_SECRET_KEY;
  let calls = 0;
  let checks = 0;
  let reply: unknown = { success: true, action: "pickup_request" };
  let status = 200;
  let networkError = false;
  globalThis.fetch = async (url, init) => {
    calls++;
    assert.equal(url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
    assert.equal(init?.method, "POST");
    assert.equal(init?.cache, "no-store");
    assert.ok(init?.signal);
    assert.deepEqual(JSON.parse(String(init?.body)), { secret: "test-secret", response: "test-token" });
    if (networkError) throw new Error("Network unavailable");
    return new Response(JSON.stringify(reply), { status });
  };
  try {
    process.env.TURNSTILE_SECRET_KEY = "test-secret";
    for (const token of [undefined, null, 123, "", " ", "x".repeat(2049)]) {
      const result = await verifyPickupTurnstile(token);
      assert.equal(result.success, false);
      if (!result.success) assert.equal(result.status, 400);
      checks++;
    }
    assert.equal(calls, 0);
    delete process.env.TURNSTILE_SECRET_KEY;
    const unconfigured = await verifyPickupTurnstile("test-token");
    assert.equal(unconfigured.success, false);
    if (!unconfigured.success) assert.equal(unconfigured.status, 503);
    assert.equal(calls, 0);
    checks++;
    process.env.TURNSTILE_SECRET_KEY = "test-secret";
    assert.deepEqual(await verifyPickupTurnstile("test-token"), { success: true });
    checks++;
    for (const response of [
      { success: false, "error-codes": ["timeout-or-duplicate"] },
      { success: false, "error-codes": ["invalid-input-response"] },
      { success: true, action: "signup" },
      { success: true },
    ]) {
      reply = response;
      const result = await verifyPickupTurnstile("test-token");
      assert.equal(result.success, false);
      if (!result.success) assert.equal(result.status, 400);
      checks++;
    }
    for (const response of [null, {}, { success: "true" },
      { success: false, "error-codes": ["internal-error"] },
      { success: false, "error-codes": ["invalid-input-secret"] }]) {
      reply = response;
      const result = await verifyPickupTurnstile("test-token");
      assert.equal(result.success, false);
      if (!result.success) assert.equal(result.status, 503);
      checks++;
    }
    status = 500;
    assert.equal((await verifyPickupTurnstile("test-token")).success, false);
    status = 200;
    networkError = true;
    assert.equal((await verifyPickupTurnstile("test-token")).success, false);
    networkError = false;
    checks += 2;

    // Exercise the actual public API: no DB, geocoding, or emails may be reached.
    const pickup = { donor_name: "Test", donor_email: "test@example.org", address: "123 Test Street", food_type: "Produce" };
    for (const token of [undefined, "test-token"]) {
      reply = { success: false, "error-codes": ["timeout-or-duplicate"] };
      const response = await POST(new Request("http://localhost/api/pickups", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pickup, turnstile_token: token }),
      }));
      assert.equal(response.status, 400);
      assert.match((await response.json()).error, /security check/i);
      checks++;
    }
    reply = { success: true, action: "pickup_request" };
    delete process.env.TURNSTILE_SECRET_KEY;
    const response = await POST(new Request("http://localhost/api/pickups", {
      method: "POST", body: JSON.stringify({ ...pickup, turnstile_token: "test-token" }),
    }));
    assert.equal(response.status, 503);
    checks++;
    console.log(`Passed ${checks} Turnstile checks (mocked Cloudflare; no database writes or emails).`);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
    else process.env.TURNSTILE_SECRET_KEY = originalSecret;
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
