import { NextResponse } from "next/server";
import { z } from "zod";
import { allowRequest, requestAddress } from "@/lib/request-rate-limit";
import { isTrustedMutation } from "@/lib/request-origin";

const schema = z.object({ token: z.string().min(1), newPassword: z.string().min(8).max(256) });
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isTrustedMutation(request)) return NextResponse.json({ error: "Ugyldig forespørgselsoprindelse." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  if (!await allowRequest(`reset-password:${requestAddress(request)}`, 10, 60_000)) return NextResponse.json({ error: "Prøv igen om et øjeblik." }, { status: 429, headers: { "Retry-After": "60", "Cache-Control": "no-store" } });

  const parsed = schema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return NextResponse.json({ error: "Adgangskoden skal være mindst 8 tegn." }, { status: 400, headers: { "Cache-Control": "no-store" } });

  const authUrl = process.env.NEON_AUTH_BASE_URL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!authUrl || !appUrl) throw new Error("Neon Auth environment is not configured.");

  const upstream = await fetch(`${authUrl}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: appUrl },
    body: JSON.stringify({ token: parsed.data.token, newPassword: parsed.data.newPassword }),
    cache: "no-store",
  }).catch(() => undefined);

  if (!upstream?.ok) return NextResponse.json({ error: "Linket er ugyldigt eller udløbet. Anmod om et nyt." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
