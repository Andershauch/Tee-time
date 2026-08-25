import { after, NextResponse } from "next/server";
import { z } from "zod";
import { AuthenticationRequiredError, AuthorizationError, requireStaff } from "@/lib/auth/access";
import { IllegalStatusTransitionError, InvalidApprovedTimeError, StatusConflictError, updateOrderStatus } from "@/lib/staff-orders";
import { deliverPrintOutboxById } from "@/lib/kitchen-printer";
import { isTrustedMutation } from "@/lib/request-origin";
import { logOperationalEvent } from "@/lib/operational-log";

const schema = z.object({ expectedVersion: z.number().int().positive(), status: z.enum(["approved", "rejected"]), approvedFor: z.string().datetime({ offset: true }).optional() }).superRefine((value, context) => {
  if (value.approvedFor && value.status !== "approved") context.addIssue({ code: "custom", message: "Et tidspunkt kan kun foreslås ved godkendelse." });
});
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isTrustedMutation(request)) return NextResponse.json({ error: "Ugyldig forespørgselsoprindelse." }, { status: 403, headers: { "Cache-Control": "no-store" } });
    const staff = await requireStaff();
    const parsed = schema.safeParse(await request.json().catch(() => undefined));
    if (!parsed.success) return NextResponse.json({ error: "Ugyldig statusændring." }, { status: 400 });
    const { id } = await params;
    const { order: updated, printOutboxId } = await updateOrderStatus({ orderId: id, expectedVersion: parsed.data.expectedVersion, status: parsed.data.status, approvedFor: parsed.data.approvedFor ? new Date(parsed.data.approvedFor) : undefined, actorUserId: staff.id });
    if (printOutboxId) after(async () => {
      try { await deliverPrintOutboxById(printOutboxId); } catch { logOperationalEvent("print_delivery_failed", { outboxId: printOutboxId, code: "post_commit_dispatch" }); }
    });
    return NextResponse.json({ id: updated.id, status: updated.status, version: updated.version }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: "Log ind for at fortsætte." }, { status: 401 });
    if (error instanceof AuthorizationError) return NextResponse.json({ error: "Ingen adgang." }, { status: 403 });
    if (error instanceof StatusConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof IllegalStatusTransitionError) return NextResponse.json({ error: error.message }, { status: 422 });
    if (error instanceof InvalidApprovedTimeError) return NextResponse.json({ error: error.message }, { status: 422 });
    throw error;
  }
}
