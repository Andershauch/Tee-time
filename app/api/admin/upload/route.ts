import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { AuthenticationRequiredError, AuthorizationError, requireStaff } from "@/lib/auth/access";
import { isTrustedMutation } from "@/lib/request-origin";

export const dynamic = "force-dynamic";

const maxBytes = 4 * 1024 * 1024;
const extensionByType: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

function hasExpectedSignature(type: string, bytes: Uint8Array) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.slice(0, 8).every((value, index) => value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]);
  if (type === "image/webp") return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  if (type === "image/gif") return ["GIF87a", "GIF89a"].includes(new TextDecoder().decode(bytes.slice(0, 6)));
  return false;
}

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
    if (file.size === 0 || file.size > maxBytes) return NextResponse.json({ error: "Billedet må højst fylde 4 MB og må ikke være tomt." }, { status: 400 });
    const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (!hasExpectedSignature(file.type, signature)) return NextResponse.json({ error: "Filens indhold matcher ikke billedtypen." }, { status: 400 });
    const blob = await put(`menu/${crypto.randomUUID()}.${extension}`, file, { access: "public", addRandomSuffix: false });
    return NextResponse.json({ url: blob.url }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: "Log ind for at fortsætte." }, { status: 401 });
    if (error instanceof AuthorizationError) return NextResponse.json({ error: "Ingen adgang." }, { status: 403 });
    throw error;
  }
}
