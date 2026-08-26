import "./load-env";

import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "./database";
import { staffProfiles } from "./schema";

// Onboards one real, individually-accountable staff or admin account —
// replacing the single shared-per-role credential this project started
// with (see docs/DECISIONS.md, "how the shared account is administered").
// The person never sees or types a password here: the account is created
// with a long random one nobody knows, which is immediately invalidated by
// requesting a password reset, so their first action is choosing their own
// password from the email that triggers (app/api/auth/neon-webhook + lib/auth-mail.ts).
//
// Usage: npm run db:invite-staff -- person@example.com "Fulde Navn" staff|admin

const [emailArg, nameArg, roleArg] = process.argv.slice(2);
const email = emailArg?.trim().toLowerCase();
const name = nameArg?.trim();
const role = roleArg === "admin" ? ("admin" as const) : roleArg === "staff" ? ("staff" as const) : undefined;

if (!email || !name || !role) {
  throw new Error('Usage: npm run db:invite-staff -- person@example.com "Fulde Navn" staff|admin');
}

const baseUrl = process.env.NEON_AUTH_BASE_URL;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
if (!baseUrl || !appUrl) throw new Error("NEON_AUTH_BASE_URL and NEXT_PUBLIC_APP_URL are required.");

const discardPassword = randomBytes(24).toString("base64url");

const signUp = await fetch(`${baseUrl}/sign-up/email`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: appUrl },
  body: JSON.stringify({ email, password: discardPassword, name, callbackURL: appUrl }),
});
if (!signUp.ok && signUp.status !== 422) throw new Error(`Could not create the Neon Auth account (${signUp.status}).`);

const result = await getDb().execute(sql`SELECT id FROM neon_auth."user" WHERE email = ${email} LIMIT 1`);
const authUserId = (result.rows[0] as { id?: string } | undefined)?.id;
if (!authUserId) throw new Error("Neon Auth account was not found after creation.");

await getDb().insert(staffProfiles).values({ authUserId, displayName: name, role, isActive: true })
  .onConflictDoUpdate({ target: staffProfiles.authUserId, set: { displayName: name, role, isActive: true, updatedAt: sql`now()` } });

// Mirrors better-auth's email/password "forget password" endpoint. Field
// names (`redirectTo`) follow better-auth's documented client method
// (authClient.forgetPassword); double check against your Neon Auth
// dashboard/docs if this 400s, since Neon's own docs don't spell out the
// raw HTTP contract for this specific call.
const reset = await fetch(`${baseUrl}/forget-password`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: appUrl },
  body: JSON.stringify({ email, redirectTo: appUrl }),
});
if (!reset.ok) throw new Error(`Account was created, but the password-reset email could not be requested (${reset.status}). Ask them to use "Glemt adgangskode" on the sign-in page instead.`);

console.info(`${name} <${email}> is provisioned as ${role}. They'll receive an email to set their password.`);
