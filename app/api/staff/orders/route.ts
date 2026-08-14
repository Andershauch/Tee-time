import { NextResponse } from "next/server";
import { AuthenticationRequiredError, AuthorizationError, requireStaff } from "@/lib/auth/access";
import { getStaffOrders } from "@/lib/staff-orders";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireStaff();
    const scope = new URL(request.url).searchParams.get("scope") === "archived" ? "archived" : "active";
    return NextResponse.json({ orders: await getStaffOrders(scope) }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: "Log ind for at fortsætte." }, { status: 401 });
    if (error instanceof AuthorizationError) return NextResponse.json({ error: "Ingen adgang." }, { status: 403 });
    throw error;
  }
}
