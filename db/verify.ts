import "./load-env";
import { neon } from "@neondatabase/serverless";
import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { allergens, categories, emailOutbox, offers, productAllergens, productOptions, products } from "./schema";

const environment = process.env.DEPLOYMENT_ENV;
const connectionString = process.env.DATABASE_URL;

if (environment !== "local" && environment !== "preview") {
  throw new Error("test:db requires DEPLOYMENT_ENV=local or preview.");
}
if (!connectionString) throw new Error("DATABASE_URL is required for test:db.");

const db = drizzle({ client: neon(connectionString) });
const [activeCategories, activeProducts, activeOptions, activeAllergens, activeOffers, activeLinks, outboxProbe] = await Promise.all([
  db.select().from(categories).where(eq(categories.isActive, true)).orderBy(asc(categories.sortOrder)),
  db.select().from(products).where(eq(products.isActive, true)).orderBy(asc(products.sortOrder)),
  db.select().from(productOptions).where(eq(productOptions.isActive, true)),
  db.select().from(allergens).where(eq(allergens.isActive, true)),
  db.select().from(offers).where(eq(offers.isActive, true)),
  db.select().from(productAllergens).where(eq(productAllergens.isActive, true)),
  db.select({ id: emailOutbox.id }).from(emailOutbox).limit(1),
]);

if (!activeCategories.length || !activeProducts.length || !activeOffers.length) {
  throw new Error("Seed verification failed: expected active categories, products, and offers.");
}
if (!Array.isArray(outboxProbe)) throw new Error("Phase 5 verification failed: email outbox is unavailable.");
if (activeProducts.some((product) => !Number.isInteger(product.priceOre) || product.priceOre < 0)) {
  throw new Error("Seed verification failed: product prices must be non-negative integer øre.");
}
const categoryIds = new Set(activeCategories.map((category) => category.id));
const productIds = new Set(activeProducts.map((product) => product.id));
const allergenIds = new Set(activeAllergens.map((allergen) => allergen.id));
if (activeProducts.some((product) => !categoryIds.has(product.categoryId)) || activeOptions.some((option) => !productIds.has(option.productId)) || activeLinks.some((link) => !productIds.has(link.productId) || !allergenIds.has(link.allergenId))) {
  throw new Error("Seed verification failed: active menu relations are incomplete.");
}

console.info(`Verified ${activeCategories.length} categories, ${activeProducts.length} products, ${activeOptions.length} options, ${activeAllergens.length} allergens, ${activeOffers.length} offers, and email outbox availability in ${environment}.`);
