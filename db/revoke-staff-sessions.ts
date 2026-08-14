import "./load-env";

import { eq, sql } from "drizzle-orm";
import { getDb } from "./database";
import { staffSessions } from "./schema";

if (process.env.DEPLOYMENT_ENV !== "local" && process.env.DEPLOYMENT_ENV !== "preview") throw new Error("Session revocation is run through the production access runbook.");

const email = process.argv[2]?.trim().toLowerCase();
if (!email) throw new Error("Usage: npm run db:revoke-staff-sessions -- person@example.com");

const result = await getDb().execute(sql`SELECT id FROM neon_auth."user" WHERE email = ${email} LIMIT 1`);
const authUserId = (result.rows[0] as { id?: string } | undefined)?.id;
if (!authUserId) throw new Error("No Neon Auth user was found for that email.");

await getDb().update(staffSessions).set({ expiresAt: new Date() }).where(eq(staffSessions.authUserId, authUserId));
console.info("Existing local staff sessions were revoked.");
