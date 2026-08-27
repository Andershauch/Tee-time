import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { AuthenticationRequiredError, AuthorizationError, requireStaff } from "@/lib/auth/access";
import { AdminCatalogConflictError, createAllergen, createCategory, createOffer, createOption, createProduct, setProductAllergen, updateCatalogRecord } from "@/lib/admin-catalog";
import { isTrustedMutation } from "@/lib/request-origin";

const text = z.string().trim().min(1).max(240);
const imagePath = z.string().trim().max(2_000).refine((value) => {
  if (value === "" || value.startsWith("/images/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}, "Ugyldig billedadresse.");
const patchSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("category"), id: z.string().min(1), patch: z.object({ name: text.optional(), isActive: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0) }),
  z.object({ kind: z.literal("product"), id: z.string().min(1), patch: z.object({ name: text.optional(), description: z.string().trim().max(1_000).optional(), priceOre: z.number().int().min(0).max(1_000_000).optional(), imagePath: imagePath.optional(), isSoldOut: z.boolean().optional(), isActive: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0) }),
  z.object({ kind: z.literal("allergen"), id: z.string().min(1), patch: z.object({ name: text.optional(), isActive: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0) }),
  z.object({ kind: z.literal("option"), id: z.string().min(1), patch: z.object({ name: text.optional(), priceDeltaOre: z.number().int().min(0).max(1_000_000).optional(), isActive: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0) }),
  z.object({ kind: z.literal("offer"), id: z.string().min(1), patch: z.object({ title: text.optional(), badge: text.optional(), description: z.string().trim().max(1_000).optional(), imagePath: imagePath.optional(), priceOre: z.number().int().min(0).max(1_000_000).nullable().optional(), isSoldOut: z.boolean().optional(), isActive: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0) }),
  z.object({ kind: z.literal("product-allergen"), productId: z.string().min(1), allergenId: z.string().min(1), isActive: z.boolean() }),
]);
const createSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("category"), name: text }),
  z.object({ kind: z.literal("allergen"), name: text }),
  z.object({ kind: z.literal("product"), categoryId: z.string().min(1), name: text, priceOre: z.number().int().min(0).max(1_000_000) }),
  z.object({ kind: z.literal("option"), productId: z.string().min(1), name: text, priceDeltaOre: z.number().int().min(0).max(1_000_000) }),
  z.object({ kind: z.literal("offer"), title: text, badge: z.string().trim().max(100).default(""), description: z.string().trim().max(1_000).default(""), priceOre: z.number().int().min(0).max(1_000_000).nullable().default(null) }),
]);
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    if (!isTrustedMutation(request)) return NextResponse.json({ error: "Ugyldig forespørgselsoprindelse." }, { status: 403, headers: { "Cache-Control": "no-store" } });
    await requireStaff(["admin"]);
    const parsed = patchSchema.safeParse(await request.json().catch(() => undefined));
    if (!parsed.success) return NextResponse.json({ error: "Ugyldig menuændring." }, { status: 400 });
    if (parsed.data.kind === "product-allergen") {
      await setProductAllergen(parsed.data.productId, parsed.data.allergenId, parsed.data.isActive);
      revalidateTag("guest-menu", { expire: 0 });
      return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    }
    const changed = await updateCatalogRecord(parsed.data);
    if (!changed.length) return NextResponse.json({ error: "Posten findes ikke." }, { status: 404 });
    revalidateTag("guest-menu", { expire: 0 });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: "Log ind for at fortsætte." }, { status: 401 });
    if (error instanceof AuthorizationError) return NextResponse.json({ error: "Ingen adgang." }, { status: 403 });
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    if (!isTrustedMutation(request)) return NextResponse.json({ error: "Ugyldig forespørgselsoprindelse." }, { status: 403, headers: { "Cache-Control": "no-store" } });
    await requireStaff(["admin"]);
    const parsed = createSchema.safeParse(await request.json().catch(() => undefined));
    if (!parsed.success) return NextResponse.json({ error: "Ugyldige oplysninger." }, { status: 400 });
    const data = parsed.data;
    const item = data.kind === "category" ? await createCategory(data.name)
      : data.kind === "allergen" ? await createAllergen(data.name)
      : data.kind === "product" ? await createProduct(data.categoryId, data.name, data.priceOre)
      : data.kind === "option" ? await createOption(data.productId, data.name, data.priceDeltaOre)
      : await createOffer(data.title, data.badge, data.description, data.priceOre);
    revalidateTag("guest-menu", { expire: 0 });
    return NextResponse.json({ ok: true, item }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: "Log ind for at fortsætte." }, { status: 401 });
    if (error instanceof AuthorizationError) return NextResponse.json({ error: "Ingen adgang." }, { status: 403 });
    if (error instanceof AdminCatalogConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    throw error;
  }
}
