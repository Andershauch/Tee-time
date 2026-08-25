import { NextResponse } from "next/server";
import { hasValidCronSecret } from "@/lib/cron-auth";
import { requeueConfigurationBlockedPrintJobs, retryDuePrintOutbox } from "@/lib/kitchen-printer";
import { logOperationalEvent } from "@/lib/operational-log";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!hasValidCronSecret(request)) {
    logOperationalEvent("print_retry_unauthorized");
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  try {
    await requeueConfigurationBlockedPrintJobs();
    const deliveries = await retryDuePrintOutbox();
    return NextResponse.json({ processed: deliveries.length }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    logOperationalEvent("cron_failed", { code: "print_retry" });
    return NextResponse.json({ error: "Retry kunne ikke gennemføres." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
