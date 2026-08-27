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
  event_data: z.object({ link_url: z.string().url().max(2_048), link_type: linkTypeSchema }),
});

function isAllowedAuthLink(value: string) {
  const allowedOrigins = [process.env.NEON_AUTH_BASE_URL, process.env.NEXT_PUBLIC_APP_URL]
    .flatMap((candidate) => {
      try { return candidate ? [new URL(candidate).origin] : []; } catch { return []; }
    });
  try {
    const url = new URL(value);
    const localHttp = process.env.DEPLOYMENT_ENV === "local" && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
    return (url.protocol === "https:" || localHttp) && allowedOrigins.includes(url.origin);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (rawBody.length > 65_536) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });

  try {
    await verifyNeonAuthWebhook(rawBody, request.headers);
  } catch (error) {
    logOperationalEvent("auth_webhook_rejected", { code: error instanceof WebhookSignatureError ? error.message : "verification_failed" });
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rawJson: unknown = await Promise.resolve().then(() => JSON.parse(rawBody)).catch(() => undefined);
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
        if (!isAllowedAuthLink(event.event_data.link_url)) return NextResponse.json({ error: "invalid_link" }, { status: 400 });
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
