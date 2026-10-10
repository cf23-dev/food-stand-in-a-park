// Run: npx tsx scripts/test-volunteer-hours.ts
// Requires @electric-sql/pglite (isolated PostgreSQL; no live database touched).
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { hourCommandSchema, signatureSchema } from "../lib/hours";

const db = new PGlite();
const volunteer = "10000000-0000-4000-8000-000000000001";
const other = "10000000-0000-4000-8000-000000000002";
const admin = "10000000-0000-4000-8000-000000000003";
const claim = "20000000-0000-4000-8000-000000000001";
const pendingClaim = "20000000-0000-4000-8000-000000000002";
const id = "30000000-0000-4000-8000-000000000001";
let checks = 0;
async function rejects(command: Record<string, unknown>, pattern: RegExp) {
  await assert.rejects(() => rpc(command), pattern); checks++;
}
async function actor(uid: string) { await db.query("select set_config('app.uid', $1, false)", [uid]); }
async function rpc(command: Record<string, unknown>) {
  const result = await db.query<{ entry: { version: number; status: string; volunteer_name: string; signature: unknown } }>(
    "select public.volunteer_hour_command($1::jsonb) as entry", [JSON.stringify(command)]);
  return result.rows[0].entry;
}
async function main() {
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('app.uid', true), '')::uuid$$;
    grant usage on schema auth, public to authenticated;
    grant execute on function auth.uid() to authenticated;
    create type public.user_role as enum('donor','volunteer','admin');
    create table public.profiles(id uuid primary key, email text, name text not null, role public.user_role not null, approved boolean default false);
    create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
      select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')$$;
    create table public.volunteer_claims(id uuid primary key, volunteer_id uuid references public.profiles, completed_at timestamptz);
    create table public.notifications(id uuid primary key default gen_random_uuid(), volunteer_id uuid, title text, body text);
    insert into public.profiles values('${volunteer}', 'volunteer@test.local', 'Test Volunteer', 'volunteer', true),
      ('${other}', 'other@test.local', 'Other Volunteer', 'volunteer', true), ('${admin}', 'admin@test.local', 'Test Admin', 'admin', true);
    insert into public.volunteer_claims values('${claim}', '${volunteer}', now()), ('${pendingClaim}', '${volunteer}', null);
    alter table public.profiles enable row level security;
    create policy self_profile on public.profiles for all to authenticated using(id = auth.uid() or public.is_admin()) with check(id = auth.uid() or public.is_admin());
    grant select, update on public.profiles to authenticated;
  `);
  const migration = await readFile("supabase/migration-003-volunteer-hours.sql", "utf8");
  await db.exec(migration);
  // Running a migration twice should preserve records and policies.
  await db.exec(migration);
  await db.exec("set role authenticated");
  await actor(volunteer);
  const fields = { service_date: "2026-01-01", duration_minutes: 90, activity: "Food delivery", notes: "Delivered donations", program: "School service", claim_id: claim };
  assert.equal(hourCommandSchema.safeParse({ action: "create", id, submit: true, ...fields }).success, true); checks++;
  assert.equal(signatureSchema.safeParse({ kind: "drawn", strokes: [[[1, 1], [1, 1]]] }).success, false); checks++;
  assert.equal(signatureSchema.safeParse({ kind: "drawn", strokes: [[[1, 1], [700, 20]]] }).success, false); checks++;
  assert.equal(hourCommandSchema.safeParse({ action: "create", id, submit: true, ...fields, service_date: "2026-02-30" }).success, false); checks++;
  await assert.rejects(() => db.exec(`update public.profiles set role = 'admin' where id = '${volunteer}'`), /Only administrators/); checks++;
  await assert.rejects(() => db.exec(`update public.profiles set approved = false where id = '${volunteer}'`), /Only administrators/); checks++;
  await rejects({ action: "create", id, submit: true, ...fields, duration_minutes: 0 }, /check constraint/);
  await rejects({ action: "create", id, submit: true, ...fields, service_date: "2999-01-01" }, /future/);
  await rejects({ action: "create", id, submit: true, ...fields, claim_id: pendingClaim }, /completed pickups/);
  let entry = await rpc({ action: "create", id, submit: false, ...fields });
  assert.equal(entry.status, "draft"); checks++;
  await assert.rejects(() => db.exec(`update public.volunteer_hours set status = 'signed' where id = '${id}'`), /permission denied/); checks++;
  await actor(other);
  assert.equal((await db.query("select * from public.volunteer_hours")).rows.length, 0); checks++;
  await rejects({ action: "save", id, version: entry.version, submit: false, ...fields }, /cannot access/);
  await rejects({ action: "create", id: "30000000-0000-4000-8000-000000000002", submit: true, ...fields }, /completed pickups/);
  await actor(volunteer);
  entry = await rpc({ action: "request", id, version: entry.version });
  assert.equal(entry.status, "pending"); checks++;
  await rejects({ action: "save", id, version: entry.version, submit: false, ...fields }, /Withdraw/);
  await rejects({ action: "sign", id, version: entry.version }, /administrator/);
  await actor(admin);
  await rejects({ action: "sign", id, version: entry.version, confirmed: false }, /Confirm/);
  await rejects({ action: "sign", id, version: entry.version, confirmed: true, signature: { kind: "drawn", strokes: [] } }, /draw/);
  entry = await rpc({ action: "return", id, version: entry.version, review_note: "Please include unloading time." });
  assert.equal(entry.status, "returned"); checks++;
  await actor(volunteer);
  entry = await rpc({ action: "save", id, version: entry.version, submit: true, ...fields, duration_minutes: 105 });
  const staleVersion = entry.version;
  entry = await rpc({ action: "withdraw", id, version: entry.version });
  await actor(admin);
  await rejects({ action: "return", id, version: staleVersion, review_note: "Try again" }, /changed/);
  await actor(volunteer);
  entry = await rpc({ action: "request", id, version: entry.version });
  await actor(admin);
  const signature = { kind: "drawn", strokes: [[[20, 80], [80, 30], [150, 90]]] };
  entry = await rpc({ action: "sign", id, version: entry.version, confirmed: true, signer_name: "Test Admin", signer_title: "Coordinator", signature });
  assert.equal(entry.status, "signed"); assert.deepEqual(entry.signature, signature); checks += 2;
  await rejects({ action: "sign", id, version: entry.version, confirmed: true }, /pending/);
  await actor(volunteer);
  await rejects({ action: "withdraw", id, version: entry.version }, /pending/);
  await rejects({ action: "delete", id, version: entry.version }, /Signed records/);
  await rejects({ action: "save", id, version: entry.version, submit: false, ...fields }, /Signed records/);
  const draftId = "30000000-0000-4000-8000-000000000002";
  const draft = await rpc({ action: "create", id: draftId, submit: false, ...fields, claim_id: null });
  await rpc({ action: "delete", id: draftId, version: draft.version });
  assert.equal((await db.query("select * from public.volunteer_hour_events where entry_id = $1", [draftId])).rows.length, 2); checks++;
  await rejects({ action: "create", id: draftId, submit: false, ...fields }, /unique constraint/);
  await actor(other);
  assert.equal((await db.query("select * from public.volunteer_hour_events")).rows.length, 0); checks++;
  assert.equal((await db.query("select * from public.volunteer_hours where id = $1", [id])).rows.length, 0); checks++;
  const typedId = "30000000-0000-4000-8000-000000000003";
  let typed = await rpc({ action: "create", id: typedId, submit: true, ...fields, claim_id: null });
  await actor(admin);
  typed = await rpc({ action: "sign", id: typedId, version: typed.version, confirmed: true,
    signer_name: "Test Admin", signer_title: "Coordinator", signature: { kind: "typed", text: "Test Admin" } });
  assert.deepEqual(typed.signature, { kind: "typed", text: "Test Admin" }); checks++;
  await db.exec("set role anon");
  await rejects({ action: "request", id, version: 1 }, /permission denied/);
  await db.exec("set role authenticated");
  await actor(admin);
  const self = await rpc({ action: "create", id: draftId, submit: true, ...fields, claim_id: null });
  await rejects({ action: "sign", id: draftId, version: self.version }, /other than/);
  await db.exec("reset role");
  assert.equal((await db.query("select * from public.notifications")).rows.length, 3); checks++;
  await actor("");
  await db.exec(`create table auth.test_users(id uuid, email text, raw_user_meta_data jsonb);
    create trigger signup_test after insert on auth.test_users for each row execute function public.handle_new_user();
    insert into auth.test_users values('10000000-0000-4000-8000-000000000004', 'new@test.local', '{"name":"New User","role":"admin"}');`);
  assert.equal((await db.query<{ role: string }>("select role from public.profiles where email = 'new@test.local'")).rows[0].role, "volunteer"); checks++;
  console.log(`Passed ${checks} volunteer hour validation, workflow, signature, privacy, audit, and authority checks.`);
} finally { await db.close(); }
}
main().catch(err => { console.error(err); process.exitCode = 1; });
