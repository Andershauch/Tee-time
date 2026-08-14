import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { staffProfiles } from "@/db/schema";
import { createStaffSession, revokeStaffSession, staffSessionCookie } from "@/lib/auth/access";
import { allowRequest, requestAddress } from "@/lib/request-rate-limit";
import { isTrustedMutation } from "@/lib/request-origin";

const credentials = z.object({ email: z.string().trim().email(), password: z.string().min(8).max(256) });
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isTrustedMutation(request)) return NextResponse.json({ error: "Ugyldig forespørgselsoprindelse." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  if (!await allowRequest(`staff-login:${requestAddress(request)}`, 10, 60_000)) return NextResponse.json({ error: "Prøv igen om et øjeblik." }, { status: 429, headers: { "Retry-After": "60", "Cache-Control": "no-store" } });
  const parsed = credentials.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return NextResponse.json({ error: "Login kunne ikke godkendes." }, { status: 400 });
  const authUrl = process.env.NEON_AUTH_BASE_URL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!authUrl || !appUrl) throw new Error("Neon Auth environment is not configured.");
  const upstream = await fetch(`${authUrl}/sign-in/email`, { method: "POST", headers: { "Content-Type": "application/json", Origin: appUrl }, body: JSON.stringify({ ...parsed.data, callbackURL: appUrl }), cache: "no-store" }).catch(() => undefined);
  if (!upstream?.ok) return NextResponse.json({ error: "Login kunne ikke godkendes." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const body = await upstream.json().catch(() => undefined) as { user?: { id?: unknown } } | undefined;
  if (typeof body?.user?.id !== "string") return NextResponse.json({ error: "Login kunne ikke godkendes." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const [profile] = await getDb().select({ id: staffProfiles.authUserId }).from(staffProfiles).where(and(eq(staffProfiles.authUserId, body.user.id), eq(staffProfiles.isActive, true))).limit(1);
  if (!profile) return NextResponse.json({ error: "Login kunne ikke godkendes." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const session = await createStaffSession(profile.id);
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(staffSessionCookie, session.token, { httpOnly: true, sameSite: "lax", secure: process.env.DEPLOYMENT_ENV === "production", expires: session.expiresAt, path: "/" });
  return response;
}

export async function DELETE(request: Request) {
  if (!isTrustedMutation(request)) return NextResponse.json({ error: "Ugyldig forespørgselsoprindelse." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  await revokeStaffSession((await cookies()).get(staffSessionCookie)?.value);
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(staffSessionCookie, "", { httpOnly: true, sameSite: "lax", expires: new Date(0), path: "/" });
  return response;
}
