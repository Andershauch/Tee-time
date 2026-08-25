ALTER TABLE "offers" ADD COLUMN "price_ore" integer;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "is_sold_out" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_price_ore_non_negative" CHECK ("offers"."price_ore" IS NULL OR "offers"."price_ore" >= 0);