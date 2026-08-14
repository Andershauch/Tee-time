import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("phase 2 baseline migration", () => {
  const migrations = readdirSync("db/migrations").filter((file) => file.endsWith(".sql")).map((file) => readFileSync(`db/migrations/${file}`, "utf8"));
  const migration = migrations.join("\n");

  it("creates the menu schema without destructive statements", () => {
    expect(migration).toContain('CREATE TABLE "products"');
    expect(migration).toContain('"price_ore" integer NOT NULL');
    expect(migration).toContain("ON DELETE restrict");
    expect(migration).not.toMatch(/(?:^|statement-breakpoint\n)\s*(DROP|DELETE|TRUNCATE)\s/i);
  });

  it("keeps the compatibility idempotency index safe for a clean migration", () => {
    expect(migration).toContain('CREATE UNIQUE INDEX IF NOT EXISTS "orders_session_idempotency_unique"');
  });
});
