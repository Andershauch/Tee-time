import { cookies } from "next/headers";
import { after, NextResponse } from "next/server";
import { createGuestSession, createOrder, findGuestSession, guestSessionCookie, OrderValidationError } from "@/lib/orders";
import { orderRequestSchema } from "@/lib/order-validation";
import { allowRequest, requestAddress } from "@/lib/request-rate-limit";
import { isTrustedMutation } from "@/lib/request-origin";
import { deliverOutboxById } from "@/lib/email-outbox";
import { logOperationalEvent } from "@/lib/operational-log";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isTrustedMutation(request) || !request.headers.get("content-type")?.includes("application/json")) return NextResponse.json({ error: "Ugyldig forespørgsel." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  if (!await allowRequest(`create:${requestAddress(request)}`, 8, 60_000)) return NextResponse.json({ error: "Prøv igen om et øjeblik." }, { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": "60" } });
  const parsed = orderRequestSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return NextResponse.json({ error: "Kontrollér dine ordreoplysninger." }, { status: 400, headers: { "Cache-Control": "no-store" } });

  const cookieStore = await cookies();
  const existingSession = await findGuestSession(cookieStore.get(guestSessionCookie)?.value);
  let newSession: Awaited<ReturnType<typeof createGuestSession>> | undefined;
  if (!existingSession) {
    newSession = await createGuestSession();
  }

  try {
    const result = await createOrder(parsed.data, existingSession?.id ?? newSession!.id);
    if (result.duplicate) return NextResponse.json({ error: "Ordren er allerede modtaget." }, { status: 409, headers: { "Cache-Control": "no-store" } });
    after(async () => {
      try { await deliverOutboxById(result.outboxId); } catch { logOperationalEvent("email_delivery_failed", { outboxId: result.outboxId, code: "post_commit_dispatch" }); }
    });
    const response = NextResponse.json({ token: result.order.token, orderNumber: result.order.orderNumber }, { status: 201, headers: { "Cache-Control": "no-store" } });
    if (newSession) response.cookies.set(guestSessionCookie, newSession.token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: newSession.expiresAt });
    return response;
  } catch (error) {
    if (error instanceof OrderValidationError) return NextResponse.json({ error: error.message }, { status: 409, headers: { "Cache-Control": "no-store" } });
    logOperationalEvent("order_create_failed", { code: error instanceof Error ? error.name : "unknown" });
    throw error;
  }
}
