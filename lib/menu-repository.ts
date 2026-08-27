import "server-only";

import { and, asc, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { getDb } from "@/db/client";
import { allergens, categories, offers, productAllergens, productOptions, products } from "@/db/schema";
import { categories as fixtureCategories, offers as fixtureOffers, products as fixtureProducts } from "@/lib/fixtures";
import { defaultRestaurantHours, getRestaurantHours, type RestaurantHours } from "@/lib/restaurant-settings";

export type MenuProduct = typeof fixtureProducts[number];
export type MenuOffer = typeof fixtureOffers[number];

export type MenuReadModel = {
  categories: readonly string[];
  products: MenuProduct[];
  offers: MenuOffer[];
  hours: RestaurantHours;
  source: "neon" | "fixtures";
};

function groupBy<T>(rows: T[], getKey: (row: T) => string) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = getKey(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return groups;
}

export async function getActiveMenuFromNeon(now = new Date()): Promise<MenuReadModel> {
  const db = getDb();
  const [categoryRows, productRows, optionRows, allergenRows, offerRows, hours] = await Promise.all([
    db.select().from(categories).where(eq(categories.isActive, true)).orderBy(asc(categories.sortOrder)),
    db.select().from(products).where(eq(products.isActive, true)).orderBy(asc(products.sortOrder)),
    db.select().from(productOptions).where(eq(productOptions.isActive, true)).orderBy(asc(productOptions.sortOrder)),
    db.select({ productId: productAllergens.productId, name: allergens.name, sortOrder: allergens.sortOrder }).from(productAllergens).innerJoin(allergens, eq(productAllergens.allergenId, allergens.id)).where(and(eq(productAllergens.isActive, true), eq(allergens.isActive, true))).orderBy(asc(allergens.sortOrder)),
    db.select().from(offers).where(and(eq(offers.isActive, true), or(isNull(offers.startsAt), lte(offers.startsAt, now)), or(isNull(offers.endsAt), gte(offers.endsAt, now)))).orderBy(asc(offers.sortOrder)),
    getRestaurantHours(),
  ]);

  const categoryById = new Map(categoryRows.map((category) => [category.id, category.name]));
  const optionsByProduct = groupBy(optionRows, (option) => option.productId);
  const allergensByProduct = groupBy(allergenRows, (allergen) => allergen.productId);

  const orderableOfferIds = offerRows.filter((offer) => offer.priceOre !== null).map((offer) => `offer-product-${offer.id}`);
  const offerProductRows = orderableOfferIds.length ? await db.select({ id: products.id, slug: products.slug }).from(products).where(and(inArray(products.id, orderableOfferIds), eq(products.isActive, true))) : [];
  const orderSlugByOfferProductId = new Map(offerProductRows.map((row) => [row.id, row.slug]));

  return {
    categories: categoryRows.map((category) => category.name),
    products: productRows.flatMap((product) => {
      const category = categoryById.get(product.categoryId);
      if (!category) return [];
      return [{
        id: product.slug,
        category,
        name: product.name,
        description: product.description,
        price: product.priceOre / 100,
        imagePath: product.imagePath,
        soldOut: product.isSoldOut,
        allergens: (allergensByProduct.get(product.id) ?? []).map((allergen) => allergen.name),
        options: (optionsByProduct.get(product.id) ?? []).map((option) => ({ label: option.name, price: option.priceDeltaOre / 100 })),
      }];
    }),
    offers: offerRows.map((offer) => ({ id: offer.id.replace("offer-", ""), title: offer.title, badge: offer.badge, description: offer.description, imagePath: offer.imagePath, price: offer.priceOre === null ? undefined : offer.priceOre / 100, soldOut: offer.isSoldOut, orderSlug: orderSlugByOfferProductId.get(`offer-product-${offer.id}`) })),
    hours,
    source: "neon",
  };
}

export async function getMenuReadModel(): Promise<MenuReadModel> {
  if (process.env.TEE_TIME_BUILD_WITH_FIXTURES === "1" || !process.env.DATABASE_URL) {
    return { categories: fixtureCategories, products: fixtureProducts, offers: fixtureOffers, hours: defaultRestaurantHours, source: "fixtures" };
  }

  return getCachedActiveMenuFromNeon();
}

const getCachedActiveMenuFromNeon = unstable_cache(
  () => getActiveMenuFromNeon(),
  ["tee-time-active-menu-v1"],
  { revalidate: 60, tags: ["guest-menu"] },
);
