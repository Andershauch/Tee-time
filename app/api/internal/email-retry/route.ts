import { NextResponse } from "next/server";
import { hasValidCronSecret } from "@/lib/cron-auth";
import { requeueConfigurationBlockedEmails, retryDueEmailOutbox } from "@/lib/email-outbox";
import { logOperationalEvent } from "@/lib/operational-log";
import { runOperationalMaintenance } from "@/lib/operational-maintenance";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!hasValidCronSecret(request)) {
    logOperationalEvent("email_retry_unauthorized");
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  try {
    await requeueConfigurationBlockedEmails();
    const deliveries = await retryDueEmailOutbox();
    await runOperationalMaintenance();
    return NextResponse.json({ processed: deliveries.length }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    logOperationalEvent("cron_failed", { code: "email_retry" });
    return NextResponse.json({ error: "Retry kunne ikke gennemføres." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
