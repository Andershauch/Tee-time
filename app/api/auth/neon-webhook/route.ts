import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyNeonAuthWebhook, WebhookSignatureError } from "@/lib/neon-auth-webhook";
import { sendAuthLinkEmail, sendAuthOtpEmail } from "@/lib/auth-mail";
import { logOperationalEvent } from "@/lib/operational-log";

export const dynamic = "force-dynamic";

// Only send.otp and send.magic_link are registered for this webhook (see
// docs/AUTH.md for the one-time registration command) — deliberately not
// user.before_create/user.created, which expect a different response shape
// this route doesn't implement. The default case below is a safety net in
// case Neon ever calls this URL with an event we don't otherwise expect.
const linkTypeSchema = z.enum(["sign-in", "email-verification", "forget-password"]);

const eventTypeSchema = z.object({ event_type: z.string() });

const otpEventSchema = z.object({
  event_type: z.literal("send.otp"),
  user: z.object({ email: z.string().email() }),
  event_data: z.object({ otp_code: z.string().min(1) }),
});

const magicLinkEventSchema = z.object({
  event_type: z.literal("send.magic_link"),
  user: z.object({ email: z.string().email() }),
  event_data: z.object({ link_url: z.string().min(1), link_type: linkTypeSchema }),
});

export async function POST(request: Request) {
  const rawBody = await request.text();

  try {
    await verifyNeonAuthWebhook(rawBody, request.headers);
  } catch (error) {
    logOperationalEvent("auth_webhook_rejected", { code: error instanceof WebhookSignatureError ? error.message : "verification_failed" });
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rawJson: unknown = JSON.parse(rawBody);
  const envelope = eventTypeSchema.safeParse(rawJson);
  if (!envelope.success) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  try {
    switch (envelope.data.event_type) {
      case "send.otp": {
        const event = otpEventSchema.parse(rawJson);
        await sendAuthOtpEmail({ to: event.user.email, otpCode: event.event_data.otp_code });
        break;
      }
      case "send.magic_link": {
        const event = magicLinkEventSchema.parse(rawJson);
        await sendAuthLinkEmail({ to: event.user.email, linkType: event.event_data.link_type, linkUrl: event.event_data.link_url });
        break;
      }
      default:
        break;
    }
  } catch (error) {
    logOperationalEvent("auth_webhook_send_failed", { code: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ error: "delivery_failed" }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
