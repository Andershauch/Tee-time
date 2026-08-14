CREATE TABLE "staff_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"auth_user_id" text NOT NULL,
	"session_token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "staff_sessions" ADD CONSTRAINT "staff_sessions_auth_user_id_staff_profiles_auth_user_id_fk" FOREIGN KEY ("auth_user_id") REFERENCES "public"."staff_profiles"("auth_user_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "staff_sessions_token_hash_unique" ON "staff_sessions" USING btree ("session_token_hash");--> statement-breakpoint
CREATE INDEX "staff_sessions_user_expires_idx" ON "staff_sessions" USING btree ("auth_user_id","expires_at");