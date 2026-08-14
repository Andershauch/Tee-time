import "./load-env";
import { and, eq, notInArray, sql } from "drizzle-orm";
import { getDb } from "./database";
import { allergenSeed, categorySeed, offerSeed, productSeed } from "./seed-data";
import { allergens, categories, offers, productAllergens, productOptions, products } from "./schema";

const seedSource = "phase-2-menu";

function stableAllergenId(name: string) {
  return `allergen-${name.toLocaleLowerCase("da-DK").replace("æ", "ae").replace("ø", "oe").replace("å", "aa")}`;
}

export async function seedMenu() {
  if (process.env.DEPLOYMENT_ENV === "production") {
    throw new Error("Refusing to seed production. Use the approved production data runbook.");
  }
  const db = getDb();

  for (const [sortOrder, [id, name, slug]] of categorySeed.entries()) {
    await db.insert(categories).values({ id, name, slug, sortOrder, seedSource }).onConflictDoUpdate({
      target: categories.id,
      set: { name: sql`excluded.name`, slug: sql`excluded.slug`, sortOrder: sql`excluded.sort_order`, isActive: true, seedSource, updatedAt: sql`now()` },
    });
  }

  for (const [sortOrder, name] of allergenSeed.entries()) {
    await db.insert(allergens).values({ id: stableAllergenId(name), name, sortOrder, seedSource }).onConflictDoUpdate({
      target: allergens.id,
      set: { name: sql`excluded.name`, sortOrder: sql`excluded.sort_order`, isActive: true, seedSource, updatedAt: sql`now()` },
    });
  }

  for (const [sortOrder, product] of productSeed.entries()) {
    await db.insert(products).values({
      id: product.id,
      categoryId: product.categoryId,
      name: product.name,
      slug: product.slug,
      description: product.description,
      priceOre: product.priceOre,
      imagePath: product.imagePath,
      isSoldOut: "isSoldOut" in product && product.isSoldOut === true,
      isActive: true,
      seedSource,
      sortOrder,
    }).onConflictDoUpdate({
      target: products.id,
      set: {
        categoryId: sql`excluded.category_id`, name: sql`excluded.name`, slug: sql`excluded.slug`, description: sql`excluded.description`,
        priceOre: sql`excluded.price_ore`, imagePath: sql`excluded.image_path`, isSoldOut: sql`excluded.is_sold_out`,
        sortOrder: sql`excluded.sort_order`, isActive: true, seedSource, updatedAt: sql`now()`,
      },
    });

    for (const [optionSortOrder, option] of product.options.entries()) {
      await db.insert(productOptions).values({ ...option, productId: product.id, isActive: true, seedSource, sortOrder: optionSortOrder }).onConflictDoUpdate({
        target: productOptions.id,
        set: { productId: sql`excluded.product_id`, name: sql`excluded.name`, priceDeltaOre: sql`excluded.price_delta_ore`, isActive: true, seedSource, sortOrder: sql`excluded.sort_order`, updatedAt: sql`now()` },
      });
    }

    for (const allergen of product.allergens) {
      await db.insert(productAllergens).values({ productId: product.id, allergenId: stableAllergenId(allergen), isActive: true }).onConflictDoUpdate({
        target: [productAllergens.productId, productAllergens.allergenId],
        set: { isActive: true, updatedAt: sql`now()` },
      });
    }

    const optionIds = product.options.map((option) => option.id);
    await db.update(productOptions).set({ isActive: false, updatedAt: sql`now()` }).where(and(eq(productOptions.productId, product.id), eq(productOptions.seedSource, seedSource), ...(optionIds.length ? [notInArray(productOptions.id, optionIds)] : [])));
    const allergenIds = product.allergens.map(stableAllergenId);
    await db.update(productAllergens).set({ isActive: false, updatedAt: sql`now()` }).where(and(eq(productAllergens.productId, product.id), ...(allergenIds.length ? [notInArray(productAllergens.allergenId, allergenIds)] : [])));
  }

  for (const [sortOrder, offer] of offerSeed.entries()) {
    await db.insert(offers).values({ ...offer, isActive: true, seedSource, sortOrder }).onConflictDoUpdate({
      target: offers.id,
      set: { title: sql`excluded.title`, badge: sql`excluded.badge`, description: sql`excluded.description`, imagePath: sql`excluded.image_path`, isActive: true, seedSource, sortOrder: sql`excluded.sort_order`, updatedAt: sql`now()` },
    });
  }

  await Promise.all([
    db.update(categories).set({ isActive: false, updatedAt: sql`now()` }).where(and(eq(categories.seedSource, seedSource), notInArray(categories.id, categorySeed.map(([id]) => id)))),
    db.update(allergens).set({ isActive: false, updatedAt: sql`now()` }).where(and(eq(allergens.seedSource, seedSource), notInArray(allergens.id, allergenSeed.map(stableAllergenId)))),
    db.update(products).set({ isActive: false, updatedAt: sql`now()` }).where(and(eq(products.seedSource, seedSource), notInArray(products.id, productSeed.map((product) => product.id)))),
    db.update(offers).set({ isActive: false, updatedAt: sql`now()` }).where(and(eq(offers.seedSource, seedSource), notInArray(offers.id, offerSeed.map((offer) => offer.id)))),
  ]);
}

if (import.meta.url === `file:///${process.argv[1]?.replaceAll("\\", "/")}`) {
  seedMenu().then(() => console.info("Tee-Time menu seed completed.")).catch((error: unknown) => { console.error(error); process.exitCode = 1; });
}
