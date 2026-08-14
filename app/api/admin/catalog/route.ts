import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthenticationRequiredError, AuthorizationError, requireStaff } from "@/lib/auth/access";
import { updateCatalogRecord } from "@/lib/admin-catalog";
import { isTrustedMutation } from "@/lib/request-origin";

const text = z.string().trim().min(1).max(240);
const schema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("category"), id: z.string().min(1), patch: z.object({ name: text.optional(), isActive: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0) }),
  z.object({ kind: z.literal("product"), id: z.string().min(1), patch: z.object({ name: text.optional(), description: z.string().trim().max(1_000).optional(), priceOre: z.number().int().min(0).max(1_000_000).optional(), isSoldOut: z.boolean().optional(), isActive: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0) }),
  z.object({ kind: z.literal("allergen"), id: z.string().min(1), patch: z.object({ name: text.optional(), isActive: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0) }),
  z.object({ kind: z.literal("option"), id: z.string().min(1), patch: z.object({ name: text.optional(), priceDeltaOre: z.number().int().min(0).max(1_000_000).optional(), isActive: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0) }),
  z.object({ kind: z.literal("offer"), id: z.string().min(1), patch: z.object({ title: text.optional(), badge: z.string().trim().max(100).optional(), description: z.string().trim().max(1_000).optional(), isActive: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0) }),
]);
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    if (!isTrustedMutation(request)) return NextResponse.json({ error: "Ugyldig forespørgselsoprindelse." }, { status: 403, headers: { "Cache-Control": "no-store" } });
    await requireStaff(["admin"]);
    const parsed = schema.safeParse(await request.json().catch(() => undefined));
    if (!parsed.success) return NextResponse.json({ error: "Ugyldig menuændring." }, { status: 400 });
    const changed = await updateCatalogRecord(parsed.data);
    if (!changed.length) return NextResponse.json({ error: "Posten findes ikke." }, { status: 404 });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: "Log ind for at fortsætte." }, { status: 401 });
    if (error instanceof AuthorizationError) return NextResponse.json({ error: "Ingen adgang." }, { status: 403 });
    throw error;
  }
}
