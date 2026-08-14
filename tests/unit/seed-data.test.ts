import { describe, expect, it } from "vitest";
import { allergenSeed, categorySeed, offerSeed, productSeed } from "../../db/seed-data";

describe("phase 2 seed data", () => {
  it("uses stable, unique ids and integer øre prices", () => {
    expect(new Set(categorySeed.map(([id]) => id)).size).toBe(categorySeed.length);
    expect(new Set(productSeed.map((product) => product.id)).size).toBe(productSeed.length);
    expect(new Set(productSeed.map((product) => product.slug)).size).toBe(productSeed.length);
    expect(new Set(offerSeed.map((offer) => offer.id)).size).toBe(offerSeed.length);

    for (const product of productSeed) {
      expect(Number.isInteger(product.priceOre)).toBe(true);
      expect(product.priceOre).toBeGreaterThanOrEqual(0);
      expect(product.imagePath).toMatch(/^\/images\//);
      for (const option of product.options) {
        expect(Number.isInteger(option.priceDeltaOre)).toBe(true);
        expect(option.priceDeltaOre).toBeGreaterThanOrEqual(0);
      }
    }
    expect(allergenSeed.length).toBeGreaterThan(0);
  });

  it("references only seeded categories and known allergens", () => {
    const categoryIds = new Set(categorySeed.map(([id]) => id));
    const knownAllergens = new Set(allergenSeed);

    for (const product of productSeed) {
      expect(categoryIds.has(product.categoryId)).toBe(true);
      for (const allergen of product.allergens) expect(knownAllergens.has(allergen)).toBe(true);
    }
  });
});
