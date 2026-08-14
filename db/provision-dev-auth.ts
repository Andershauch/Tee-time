import "./load-env";
import { sql } from "drizzle-orm";
import { getDb } from "./database";
import { staffProfiles } from "./schema";

if (process.env.DEPLOYMENT_ENV !== "local") throw new Error("Dev auth provisioning only runs with DEPLOYMENT_ENV=local.");
const baseUrl = process.env.NEON_AUTH_BASE_URL;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
const accounts = [
  { email: process.env.TEST_STAFF_EMAIL, password: process.env.TEST_STAFF_PASSWORD, name: "Testpersonale", role: "staff" as const },
  { email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD, name: "Testadministrator", role: "admin" as const },
];
if (!baseUrl || !appUrl || accounts.some((account) => !account.email || !account.password)) throw new Error("Local Neon Auth test credentials are required.");

for (const account of accounts) {
  const response = await fetch(`${baseUrl}/sign-up/email`, { method: "POST", headers: { "Content-Type": "application/json", Origin: appUrl }, body: JSON.stringify({ email: account.email, password: account.password, name: account.name, callbackURL: appUrl }) });
  if (!response.ok && response.status !== 422) throw new Error(`Could not provision a local Neon Auth test account (${response.status}).`);
  const result = await getDb().execute(sql`SELECT id FROM neon_auth."user" WHERE email = ${account.email} LIMIT 1`);
  const userId = (result.rows[0] as { id?: string } | undefined)?.id;
  if (!userId) throw new Error("Neon Auth account was not found after provisioning.");
  await getDb().insert(staffProfiles).values({ authUserId: userId, displayName: account.name, role: account.role, isActive: true }).onConflictDoUpdate({ target: staffProfiles.authUserId, set: { displayName: account.name, role: account.role, isActive: true, updatedAt: sql`now()` } });
}

console.info("Local staff and admin test profiles are ready.");
