CREATE TABLE "restaurant_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"opens_at" text DEFAULT '10:00' NOT NULL,
	"closes_at" text DEFAULT '21:00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "restaurant_settings_opens_at_format" CHECK ("restaurant_settings"."opens_at" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
	CONSTRAINT "restaurant_settings_closes_at_format" CHECK ("restaurant_settings"."closes_at" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
	CONSTRAINT "restaurant_settings_hours_valid" CHECK ("restaurant_settings"."closes_at" > "restaurant_settings"."opens_at")
);
