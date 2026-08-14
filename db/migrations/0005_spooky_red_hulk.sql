CREATE TABLE "staff_profiles" (
	"auth_user_id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"role" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_profiles_role_valid" CHECK ("staff_profiles"."role" IN ('staff', 'admin'))
);
--> statement-breakpoint
CREATE INDEX "staff_profiles_active_role_idx" ON "staff_profiles" USING btree ("is_active","role");