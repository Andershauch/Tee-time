import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { findGuestSession, getOrdersForSession, guestSessionCookie } from "@/lib/orders";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await findGuestSession((await cookies()).get(guestSessionCookie)?.value);
  const orders = session ? await getOrdersForSession(session.id) : [];
  return NextResponse.json({ orders }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
