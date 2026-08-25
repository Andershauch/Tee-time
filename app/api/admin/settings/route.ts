import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthenticationRequiredError, AuthorizationError, requireStaff } from "@/lib/auth/access";
import { updateRestaurantHours } from "@/lib/restaurant-settings";
import { isTrustedMutation } from "@/lib/request-origin";

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Ugyldigt tidspunkt.");
const schema = z.object({ opensAt: hhmm, closesAt: hhmm }).refine((value) => value.closesAt > value.opensAt, { message: "Lukketid skal ligge efter åbningstid." });
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    if (!isTrustedMutation(request)) return NextResponse.json({ error: "Ugyldig forespørgselsoprindelse." }, { status: 403, headers: { "Cache-Control": "no-store" } });
    await requireStaff(["admin"]);
    const parsed = schema.safeParse(await request.json().catch(() => undefined));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ugyldige åbningstider." }, { status: 400 });
    await updateRestaurantHours(parsed.data);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: "Log ind for at fortsætte." }, { status: 401 });
    if (error instanceof AuthorizationError) return NextResponse.json({ error: "Ingen adgang." }, { status: 403 });
    throw error;
  }
}
