import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { AuthenticationRequiredError, AuthorizationError, requireStaff } from "@/lib/auth/access";
import { isTrustedMutation } from "@/lib/request-origin";

export const dynamic = "force-dynamic";

const maxBytes = 5 * 1024 * 1024;
const extensionByType: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

export async function POST(request: Request) {
  try {
    if (!isTrustedMutation(request)) return NextResponse.json({ error: "Ugyldig forespørgselsoprindelse." }, { status: 403, headers: { "Cache-Control": "no-store" } });
    await requireStaff(["admin"]);
    // Newer Vercel Blob stores authenticate via OIDC (VERCEL_OIDC_TOKEN + BLOB_STORE_ID),
    // not a static BLOB_READ_WRITE_TOKEN. Either signals that a store is connected.
    if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) return NextResponse.json({ error: "Billedupload er ikke konfigureret endnu. Kontakt udvikleren for at aktivere Vercel Blob." }, { status: 503 });
    const form = await request.formData().catch(() => undefined);
    const file = form?.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Intet billede modtaget." }, { status: 400 });
    const extension = extensionByType[file.type];
    if (!extension) return NextResponse.json({ error: "Billedet skal være JPEG, PNG, WEBP eller GIF." }, { status: 400 });
    if (file.size > maxBytes) return NextResponse.json({ error: "Billedet må højst fylde 5 MB." }, { status: 400 });
    const blob = await put(`menu/${crypto.randomUUID()}.${extension}`, file, { access: "public", addRandomSuffix: false });
    return NextResponse.json({ url: blob.url }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: "Log ind for at fortsætte." }, { status: 401 });
    if (error instanceof AuthorizationError) return NextResponse.json({ error: "Ingen adgang." }, { status: 403 });
    throw error;
  }
}
