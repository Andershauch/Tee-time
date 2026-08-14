ALTER TABLE "allergens" ADD COLUMN "seed_source" text;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "seed_source" text;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "seed_source" text;--> statement-breakpoint
ALTER TABLE "product_allergens" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "product_options" ADD COLUMN "seed_source" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "seed_source" text;