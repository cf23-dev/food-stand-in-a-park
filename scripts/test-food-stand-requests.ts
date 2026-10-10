import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const volunteer = "10000000-0000-4000-8000-000000000001";
const other = "10000000-0000-4000-8000-000000000002";
const admin = "10000000-0000-4000-8000-000000000003";
const requestId = "20000000-0000-4000-8000-000000000001";
async function actor(id: string, email: string) {
  await db.query("select set_config('app.uid', $1, false), set_config('app.email', $2, false)", [id, email]);
}
async function main() {
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('app.uid', true), '')::uuid$$;
      create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('email', current_setting('app.email', true))$$;
      grant usage on schema auth, public to authenticated, anon;
      create table public.profiles(id uuid primary key, role text);
      insert into public.profiles values ('${volunteer}','volunteer'),('${other}','volunteer'),('${admin}','admin');
      create function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
        select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')$$;
    `);
    const migration = await readFile("supabase/migration-004-food-stand-requests.sql", "utf8");
    await db.exec(migration);
    await db.exec("set role authenticated");
    await actor(volunteer, "volunteer@example.org");
    await db.query(`insert into public.food_stand_requests(id,volunteer_id,name,email,age,phone,state_zip)
      values($1,$2,'Volunteer','volunteer@example.org',16,'9165550123','CA 95757')`, [requestId, volunteer]);
    assert.equal((await db.query("select * from public.food_stand_requests")).rows.length, 1);
    await assert.rejects(() => db.query(`insert into public.food_stand_requests(volunteer_id,name,email,age,phone,state_zip)
      values($1,'Spoof','volunteer@example.org',16,'9165550123','CA 95757')`, [other]), /row-level security/);
    await assert.rejects(() => db.query(`insert into public.food_stand_requests(volunteer_id,name,email,age,phone,state_zip)
      values($1,'Spoof','another@example.org',16,'9165550123','CA 95757')`, [volunteer]), /row-level security/);
    await assert.rejects(() => db.query(`insert into public.food_stand_requests(volunteer_id,name,email,age,phone,state_zip,status)
      values($1,'Spoof','volunteer@example.org',16,'9165550123','CA 95757','closed')`, [volunteer]), /row-level security/);
    assert.equal((await db.query("update public.food_stand_requests set status = 'closed' returning id")).rows.length, 0);
    await actor(other, "other@example.org");
    assert.equal((await db.query("select * from public.food_stand_requests")).rows.length, 0);
    await actor(admin, "admin@example.org");
    assert.equal((await db.query("select * from public.food_stand_requests")).rows.length, 1);
    assert.equal((await db.query<{status:string}>("update public.food_stand_requests set status = 'contacted' returning status")).rows[0].status, "contacted");
    await assert.rejects(() => db.exec("update public.food_stand_requests set status = 'invalid'"), /check constraint/);
    await db.exec("set role anon");
    await assert.rejects(() => db.exec("select * from public.food_stand_requests"), /permission denied/);
    await db.exec("reset role");
    await db.exec(migration);
    assert.equal((await db.query("select * from public.food_stand_requests")).rows.length, 1);
    console.log("Food stand requests: persistence, admin follow-up, RLS privacy, spoof prevention, and migration rerun checks passed.");
  } finally {
    await db.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
