import "server-only";

import { asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { allergens, categories, offers, productOptions, products } from "@/db/schema";

export type AdminCatalog = {
  categories: Array<{ id: string; name: string; isActive: boolean }>;
  products: Array<{ id: string; name: string; description: string; priceOre: number; isSoldOut: boolean; isActive: boolean }>;
  allergens: Array<{ id: string; name: string; isActive: boolean }>;
  options: Array<{ id: string; productId: string; name: string; priceDeltaOre: number; isActive: boolean }>;
  offers: Array<{ id: string; title: string; badge: string; description: string; isActive: boolean }>;
};

export async function getAdminCatalog(): Promise<AdminCatalog> {
  const db = getDb();
  const [categoryRows, productRows, allergenRows, optionRows, offerRows] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.sortOrder)), db.select().from(products).orderBy(asc(products.sortOrder)), db.select().from(allergens).orderBy(asc(allergens.sortOrder)), db.select().from(productOptions).orderBy(asc(productOptions.sortOrder)), db.select().from(offers).orderBy(asc(offers.sortOrder)),
  ]);
  return { categories: categoryRows.map(({ id, name, isActive }) => ({ id, name, isActive })), products: productRows.map(({ id, name, description, priceOre, isSoldOut, isActive }) => ({ id, name, description, priceOre, isSoldOut, isActive })), allergens: allergenRows.map(({ id, name, isActive }) => ({ id, name, isActive })), options: optionRows.map(({ id, productId, name, priceDeltaOre, isActive }) => ({ id, productId, name, priceDeltaOre, isActive })), offers: offerRows.map(({ id, title, badge, description, isActive }) => ({ id, title, badge, description, isActive })) };
}

export async function updateCatalogRecord(input:
  | { kind: "category"; id: string; patch: { name?: string; isActive?: boolean } }
  | { kind: "product"; id: string; patch: { name?: string; description?: string; priceOre?: number; isSoldOut?: boolean; isActive?: boolean } }
  | { kind: "allergen"; id: string; patch: { name?: string; isActive?: boolean } }
  | { kind: "option"; id: string; patch: { name?: string; priceDeltaOre?: number; isActive?: boolean } }
  | { kind: "offer"; id: string; patch: { title?: string; badge?: string; description?: string; isActive?: boolean } },
) {
  const db = getDb();
  const stamp = { updatedAt: sql`now()` };
  if (input.kind === "category") return db.update(categories).set({ ...input.patch, ...stamp }).where(eq(categories.id, input.id)).returning({ id: categories.id });
  if (input.kind === "product") return db.update(products).set({ ...input.patch, ...stamp }).where(eq(products.id, input.id)).returning({ id: products.id });
  if (input.kind === "allergen") return db.update(allergens).set({ ...input.patch, ...stamp }).where(eq(allergens.id, input.id)).returning({ id: allergens.id });
  if (input.kind === "option") return db.update(productOptions).set({ ...input.patch, ...stamp }).where(eq(productOptions.id, input.id)).returning({ id: productOptions.id });
  return db.update(offers).set({ ...input.patch, ...stamp }).where(eq(offers.id, input.id)).returning({ id: offers.id });
}
