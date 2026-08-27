import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db/client";
import { staffProfiles, staffSessions } from "@/db/schema";

export type StaffRole = "staff" | "admin";

export class AuthenticationRequiredError extends Error {}
export class AuthorizationError extends Error {}

export const staffSessionCookie = "tee-time-staff-session-v1";
// Neon validates the password at sign-in. A short local session limits exposure
// until an operator deactivates the matching profile or revokes its sessions.
const sessionLifetimeMinutes = 30;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export async function createStaffSession(authUserId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionLifetimeMinutes * 60 * 1000);
  await getDb().insert(staffSessions).values({ id: randomUUID(), authUserId, sessionTokenHash: hash(token), expiresAt });
  return { token, expiresAt };
}

export async function revokeStaffSession(token: string | undefined) {
  if (!token) return;
  await getDb().update(staffSessions).set({ expiresAt: new Date() }).where(eq(staffSessions.sessionTokenHash, hash(token)));
}

export async function revokeStaffSessionsForUser(authUserId: string) {
  await getDb().update(staffSessions).set({ expiresAt: new Date() }).where(eq(staffSessions.authUserId, authUserId));
}

export async function currentStaff() {
  const token = (await cookies()).get(staffSessionCookie)?.value;
  if (!token) return undefined;
  const [result] = await getDb().select({
    authUserId: staffSessions.authUserId,
    displayName: staffProfiles.displayName,
    role: staffProfiles.role,
  }).from(staffSessions)
    .innerJoin(staffProfiles, eq(staffProfiles.authUserId, staffSessions.authUserId))
    .where(and(
      eq(staffSessions.sessionTokenHash, hash(token)),
      gt(staffSessions.expiresAt, new Date()),
      eq(staffProfiles.isActive, true),
    ))
    .limit(1);
  const profile = result;
  if (!profile || (profile.role !== "staff" && profile.role !== "admin")) return undefined;
  return { id: profile.authUserId, displayName: profile.displayName, role: profile.role as StaffRole };
}

export async function requireStaff(roles: StaffRole[] = ["staff", "admin"]) {
  const staff = await currentStaff();
  if (!staff) throw new AuthenticationRequiredError();
  if (!roles.includes(staff.role)) throw new AuthorizationError();
  return staff;
}
