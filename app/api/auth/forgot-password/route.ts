import { NextResponse } from "next/server";
import { z } from "zod";
import { allowRequest, requestAddress } from "@/lib/request-rate-limit";
import { isTrustedMutation } from "@/lib/request-origin";

const schema = z.object({ email: z.string().trim().email() });
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isTrustedMutation(request)) return NextResponse.json({ error: "Ugyldig forespørgselsoprindelse." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  if (!await allowRequest(`forgot-password:${requestAddress(request)}`, 5, 60_000)) return NextResponse.json({ error: "Prøv igen om et øjeblik." }, { status: 429, headers: { "Retry-After": "60", "Cache-Control": "no-store" } });

  const parsed = schema.safeParse(await request.json().catch(() => undefined));
  // A malformed email still returns success: the response must never reveal
  // whether an address has an account (avoids user enumeration).
  if (!parsed.success) return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });

  const authUrl = process.env.NEON_AUTH_BASE_URL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!authUrl || !appUrl) throw new Error("Neon Auth environment is not configured.");

  await fetch(`${authUrl}/request-password-reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: appUrl },
    body: JSON.stringify({ email: parsed.data.email, redirectTo: `${appUrl}/auth/nulstil-adgangskode` }),
    cache: "no-store",
  }).catch(() => undefined);

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
