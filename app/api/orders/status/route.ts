import { NextResponse } from "next/server";
import { getOrderByPublicToken, getOrdersByPublicTokens } from "@/lib/orders";
import { allowRequest, requestAddress } from "@/lib/request-rate-limit";

export const dynamic = "force-dynamic";

const tokenPattern = /^[A-Za-z0-9_-]{32,}$/;

export async function POST(request: Request) {
  if (!await allowRequest(`status:${requestAddress(request)}`, 60, 60_000)) return NextResponse.json({ error: "Prøv igen om et øjeblik." }, { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": "60" } });
  const body = await request.json().catch(() => undefined) as { token?: unknown; tokens?: unknown } | undefined;

  if (Array.isArray(body?.tokens)) {
    const tokens = body.tokens.filter((token): token is string => typeof token === "string" && tokenPattern.test(token)).slice(0, 20);
    const byToken = await getOrdersByPublicTokens(tokens);
    return NextResponse.json({ orders: Object.fromEntries(byToken) }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  }

  if (typeof body?.token !== "string" || !tokenPattern.test(body.token)) return NextResponse.json({ error: "Ordren blev ikke fundet." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  const order = await getOrderByPublicToken(body.token);
  if (!order) return NextResponse.json({ error: "Ordren blev ikke fundet." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json(order, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
