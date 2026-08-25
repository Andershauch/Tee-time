import "server-only";

import { asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { allergens, categories, offers, productAllergens, productOptions, products } from "@/db/schema";

export type AdminCatalog = {
  categories: Array<{ id: string; name: string; isActive: boolean }>;
  products: Array<{ id: string; categoryId: string; name: string; description: string; priceOre: number; imagePath: string; isSoldOut: boolean; isActive: boolean; allergenIds: string[]; options: Array<{ id: string; name: string; priceDeltaOre: number; isActive: boolean }> }>;
  allergens: Array<{ id: string; name: string; isActive: boolean }>;
  offers: Array<{ id: string; title: string; badge: string; description: string; imagePath: string; priceOre: number | null; isSoldOut: boolean; isActive: boolean }>;
};

export class AdminCatalogConflictError extends Error {}

const offersCategoryId = "category-tilbud";

function slugify(name: string) {
  const cleaned = name.trim().toLocaleLowerCase("da-DK")
    .replaceAll("æ", "ae").replaceAll("ø", "oe").replaceAll("å", "aa")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned || "post";
}

/** The synced product id for a given offer — deterministic, so re-syncing an offer always touches the same row. */
function offerProductId(offerId: string) {
  return `offer-product-${offerId}`;
}

/**
 * Offers with a price are also orderable: this keeps a matching row in `products` (under an
 * auto-created "Tilbud" category) in sync with the offer, so "Bestil nu" can link straight to
 * ordering it through the normal menu/cart flow instead of just the general menu.
 */
export async function syncOfferProduct(offer: { id: string; title: string; description: string; imagePath: string; priceOre: number | null; isSoldOut: boolean; isActive: boolean }) {
  const db = getDb();
  const productId = offerProductId(offer.id);
  if (offer.priceOre === null || !offer.isActive) {
    await db.update(products).set({ isActive: false, updatedAt: sql`now()` }).where(eq(products.id, productId));
    return;
  }
  await db.insert(categories).values({ id: offersCategoryId, name: "Tilbud", slug: "tilbud", sortOrder: 9999, isActive: true }).onConflictDoNothing({ target: categories.id });
  const slug = `tilbud-${slugify(offer.title)}-${offer.id.slice(-6)}`;
  await db.insert(products).values({
    id: productId,
    categoryId: offersCategoryId,
    name: offer.title,
    slug,
    description: offer.description,
    priceOre: offer.priceOre,
    imagePath: offer.imagePath,
    isSoldOut: offer.isSoldOut,
    isActive: true,
    sortOrder: 0,
  }).onConflictDoUpdate({
    target: products.id,
    set: { name: offer.title, description: offer.description, priceOre: offer.priceOre, imagePath: offer.imagePath, isSoldOut: offer.isSoldOut, isActive: true, updatedAt: sql`now()` },
  });
}

export async function getAdminCatalog(): Promise<AdminCatalog> {
  const db = getDb();
  const [categoryRows, productRows, allergenRows, optionRows, offerRows, productAllergenRows] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.sortOrder)),
    db.select().from(products).orderBy(asc(products.sortOrder)),
    db.select().from(allergens).orderBy(asc(allergens.sortOrder)),
    db.select().from(productOptions).orderBy(asc(productOptions.sortOrder)),
    db.select().from(offers).orderBy(asc(offers.sortOrder)),
    db.select().from(productAllergens).where(eq(productAllergens.isActive, true)),
  ]);
  const allergenIdsByProduct = new Map<string, string[]>();
  for (const row of productAllergenRows) allergenIdsByProduct.set(row.productId, [...(allergenIdsByProduct.get(row.productId) ?? []), row.allergenId]);
  const optionsByProduct = new Map<string, AdminCatalog["products"][number]["options"]>();
  for (const row of optionRows) optionsByProduct.set(row.productId, [...(optionsByProduct.get(row.productId) ?? []), { id: row.id, name: row.name, priceDeltaOre: row.priceDeltaOre, isActive: row.isActive }]);
  return {
    categories: categoryRows.map(({ id, name, isActive }) => ({ id, name, isActive })),
    products: productRows.map(({ id, categoryId, name, description, priceOre, imagePath, isSoldOut, isActive }) => ({ id, categoryId, name, description, priceOre, imagePath, isSoldOut, isActive, allergenIds: allergenIdsByProduct.get(id) ?? [], options: optionsByProduct.get(id) ?? [] })),
    allergens: allergenRows.map(({ id, name, isActive }) => ({ id, name, isActive })),
    offers: offerRows.map(({ id, title, badge, description, imagePath, priceOre, isSoldOut, isActive }) => ({ id, title, badge, description, imagePath, priceOre, isSoldOut, isActive })),
  };
}

export async function updateCatalogRecord(input:
  | { kind: "category"; id: string; patch: { name?: string; isActive?: boolean } }
  | { kind: "product"; id: string; patch: { name?: string; description?: string; priceOre?: number; imagePath?: string; isSoldOut?: boolean; isActive?: boolean } }
  | { kind: "allergen"; id: string; patch: { name?: string; isActive?: boolean } }
  | { kind: "option"; id: string; patch: { name?: string; priceDeltaOre?: number; isActive?: boolean } }
  | { kind: "offer"; id: string; patch: { title?: string; badge?: string; description?: string; imagePath?: string; priceOre?: number | null; isSoldOut?: boolean; isActive?: boolean } },
) {
  const db = getDb();
  const stamp = { updatedAt: sql`now()` };
  if (input.kind === "category") return db.update(categories).set({ ...input.patch, ...stamp }).where(eq(categories.id, input.id)).returning({ id: categories.id });
  if (input.kind === "product") return db.update(products).set({ ...input.patch, ...stamp }).where(eq(products.id, input.id)).returning({ id: products.id });
  if (input.kind === "allergen") return db.update(allergens).set({ ...input.patch, ...stamp }).where(eq(allergens.id, input.id)).returning({ id: allergens.id });
  if (input.kind === "option") return db.update(productOptions).set({ ...input.patch, ...stamp }).where(eq(productOptions.id, input.id)).returning({ id: productOptions.id });
  const [updatedOffer] = await db.update(offers).set({ ...input.patch, ...stamp }).where(eq(offers.id, input.id)).returning();
  if (updatedOffer) await syncOfferProduct(updatedOffer);
  return updatedOffer ? [updatedOffer] : [];
}

export async function setProductAllergen(productId: string, allergenId: string, isActive: boolean) {
  await getDb().insert(productAllergens).values({ productId, allergenId, isActive }).onConflictDoUpdate({
    target: [productAllergens.productId, productAllergens.allergenId],
    set: { isActive, updatedAt: sql`now()` },
  });
}

export async function createCategory(name: string) {
  const db = getDb();
  const id = `category-${slugify(name)}`;
  const [{ nextSort }] = await db.select({ nextSort: sql<number>`coalesce(max(${categories.sortOrder}), -1) + 1` }).from(categories);
  const [created] = await db.insert(categories).values({ id, name, slug: slugify(name), sortOrder: nextSort, isActive: true }).onConflictDoNothing({ target: categories.id }).returning();
  if (!created) throw new AdminCatalogConflictError("En kategori med det navn findes allerede.");
  return { id: created.id, name: created.name, isActive: created.isActive };
}

export async function createAllergen(name: string) {
  const db = getDb();
  const id = `allergen-${slugify(name)}`;
  const [{ nextSort }] = await db.select({ nextSort: sql<number>`coalesce(max(${allergens.sortOrder}), -1) + 1` }).from(allergens);
  const [created] = await db.insert(allergens).values({ id, name, sortOrder: nextSort, isActive: true }).onConflictDoNothing({ target: allergens.id }).returning();
  if (!created) throw new AdminCatalogConflictError("Et allergen med det navn findes allerede.");
  return { id: created.id, name: created.name, isActive: created.isActive };
}

export async function createProduct(categoryId: string, name: string, priceOre: number) {
  const db = getDb();
  const slug = slugify(name);
  const id = `product-${slug}`;
  const [{ nextSort }] = await db.select({ nextSort: sql<number>`coalesce(max(${products.sortOrder}), -1) + 1` }).from(products).where(eq(products.categoryId, categoryId));
  const [created] = await db.insert(products).values({
    id,
    categoryId,
    name,
    slug,
    description: "",
    priceOre,
    imagePath: "",
    isActive: true,
    sortOrder: nextSort,
  }).onConflictDoNothing({ target: products.id }).returning();
  if (!created) throw new AdminCatalogConflictError("Et menupunkt med det navn findes allerede.");
  return { id: created.id, categoryId: created.categoryId, name: created.name, description: created.description, priceOre: created.priceOre, imagePath: created.imagePath, isSoldOut: created.isSoldOut, isActive: created.isActive, allergenIds: [] as string[], options: [] as AdminCatalog["products"][number]["options"] };
}

export async function createOption(productId: string, name: string, priceDeltaOre: number) {
  const db = getDb();
  const id = `option-${crypto.randomUUID()}`;
  const [{ nextSort }] = await db.select({ nextSort: sql<number>`coalesce(max(${productOptions.sortOrder}), -1) + 1` }).from(productOptions).where(eq(productOptions.productId, productId));
  const [created] = await db.insert(productOptions).values({ id, productId, name, priceDeltaOre, isActive: true, sortOrder: nextSort }).onConflictDoNothing({ target: [productOptions.productId, productOptions.name] }).returning();
  if (!created) throw new AdminCatalogConflictError("Et tilvalg med det navn findes allerede for dette menupunkt.");
  return { id: created.id, productId: created.productId, name: created.name, priceDeltaOre: created.priceDeltaOre, isActive: created.isActive };
}

export async function createOffer(title: string, badge: string, description: string, priceOre: number | null) {
  const db = getDb();
  const id = `offer-${crypto.randomUUID()}`;
  const [{ nextSort }] = await db.select({ nextSort: sql<number>`coalesce(max(${offers.sortOrder}), -1) + 1` }).from(offers);
  const [created] = await db.insert(offers).values({ id, title, badge, description, imagePath: "", priceOre, isSoldOut: false, isActive: true, sortOrder: nextSort }).returning();
  await syncOfferProduct(created!);
  return { id: created!.id, title: created!.title, badge: created!.badge, description: created!.description, imagePath: created!.imagePath, priceOre: created!.priceOre, isSoldOut: created!.isSoldOut, isActive: created!.isActive };
}
