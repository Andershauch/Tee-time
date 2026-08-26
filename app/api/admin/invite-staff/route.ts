import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { staffProfiles } from "@/db/schema";
import { AuthenticationRequiredError, AuthorizationError, requireStaff } from "@/lib/auth/access";
import { isTrustedMutation } from "@/lib/request-origin";
import { allowRequest, requestAddress } from "@/lib/request-rate-limit";
import { logOperationalEvent } from "@/lib/operational-log";

// Browser-triggered equivalent of db/invite-staff.ts: an admin fills in a
// name/email/role instead of an operator running a terminal command. Runs
// on the deployed server (which has normal outbound network access), unlike
// the CLI script which requires whoever runs it to reach Neon directly.
const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1).max(200),
  role: z.enum(["staff", "admin"]),
});

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isTrustedMutation(request)) return NextResponse.json({ error: "Ugyldig forespørgselsoprindelse." }, { status: 403, headers: { "Cache-Control": "no-store" } });

  try {
    await requireStaff(["admin"]);
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: "Log ind for at fortsætte." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    if (error instanceof AuthorizationError) return NextResponse.json({ error: "Ingen adgang." }, { status: 403, headers: { "Cache-Control": "no-store" } });
    throw error;
  }

  if (!await allowRequest(`invite-staff:${requestAddress(request)}`, 10, 60_000)) {
    return NextResponse.json({ error: "Prøv igen om et øjeblik." }, { status: 429, headers: { "Retry-After": "60", "Cache-Control": "no-store" } });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return NextResponse.json({ error: "Udfyld navn, en gyldig mail og en rolle." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  const { email, name, role } = parsed.data;

  const authUrl = process.env.NEON_AUTH_BASE_URL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!authUrl || !appUrl) throw new Error("Neon Auth environment is not configured.");

  const discardPassword = randomBytes(24).toString("base64url");
  const signUp = await fetch(`${authUrl}/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: appUrl },
    body: JSON.stringify({ email, password: discardPassword, name, callbackURL: appUrl }),
    cache: "no-store",
  }).catch(() => undefined);
  if (!signUp || (!signUp.ok && signUp.status !== 422)) {
    logOperationalEvent("staff_invite_failed", { code: "sign_up", status: signUp?.status });
    return NextResponse.json({ error: "Kontoen kunne ikke oprettes hos Neon Auth." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }

  const result = await getDb().execute(sql`SELECT id FROM neon_auth."user" WHERE email = ${email} LIMIT 1`);
  const authUserId = (result.rows[0] as { id?: string } | undefined)?.id;
  if (!authUserId) {
    logOperationalEvent("staff_invite_failed", { code: "missing_auth_user" });
    return NextResponse.json({ error: "Kontoen blev oprettet, men kunne ikke findes bagefter." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }

  await getDb().insert(staffProfiles).values({ authUserId, displayName: name, role, isActive: true })
    .onConflictDoUpdate({ target: staffProfiles.authUserId, set: { displayName: name, role, isActive: true, updatedAt: sql`now()` } });

  const reset = await fetch(`${authUrl}/request-password-reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: appUrl },
    body: JSON.stringify({ email, redirectTo: `${appUrl}/auth/nulstil-adgangskode` }),
    cache: "no-store",
  }).catch(() => undefined);
  if (!reset || !reset.ok) {
    logOperationalEvent("staff_invite_failed", { code: "request_password_reset", status: reset?.status });
    return NextResponse.json(
      { ok: true, warning: 'Kontoen er oprettet, men mailen kunne ikke sendes. Bed personen bruge "Glemt adgangskode" på login-siden i stedet.' },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
