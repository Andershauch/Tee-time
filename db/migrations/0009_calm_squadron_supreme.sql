ALTER TABLE "orders" DROP CONSTRAINT "orders_guest_session_id_guest_sessions_id_fk";
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "guest_session_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "anonymized_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_guest_session_id_guest_sessions_id_fk" FOREIGN KEY ("guest_session_id") REFERENCES "public"."guest_sessions"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "orders_anonymization_due_idx" ON "orders" USING btree ("anonymized_at","created_at");