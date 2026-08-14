import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { findGuestSession, guestSessionCookie, prepareReorder } from "@/lib/orders";
import { isTrustedMutation } from "@/lib/request-origin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isTrustedMutation(request) || !request.headers.get("content-type")?.includes("application/json")) return NextResponse.json({ error: "Ordren blev ikke fundet." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  const body = await request.json().catch(() => undefined) as { token?: unknown } | undefined;
  if (typeof body?.token !== "string" || !/^[A-Za-z0-9_-]{32,}$/.test(body.token)) return NextResponse.json({ error: "Ordren blev ikke fundet." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  const session = await findGuestSession((await cookies()).get(guestSessionCookie)?.value);
  if (!session) return NextResponse.json({ error: "Ordren blev ikke fundet." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  const reorder = await prepareReorder(body.token, session.id);
  if (!reorder) return NextResponse.json({ error: "Ordren blev ikke fundet." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json(reorder, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
