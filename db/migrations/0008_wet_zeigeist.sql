CREATE TABLE "email_outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"email_type" text NOT NULL,
	"recipient" text,
	"idempotency_key" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"provider_message_id" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"locked_at" timestamp with time zone,
	"last_error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_outbox_type_valid" CHECK ("email_outbox"."email_type" IN ('restaurant_new_order')),
	CONSTRAINT "email_outbox_status_valid" CHECK ("email_outbox"."status" IN ('pending', 'processing', 'sent', 'failed', 'blocked')),
	CONSTRAINT "email_outbox_attempts_non_negative" CHECK ("email_outbox"."attempts" >= 0)
);
--> statement-breakpoint
ALTER TABLE "email_outbox" ADD CONSTRAINT "email_outbox_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "email_outbox_idempotency_unique" ON "email_outbox" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "email_outbox_delivery_idx" ON "email_outbox" USING btree ("status","next_attempt_at","created_at");--> statement-breakpoint
CREATE INDEX "email_outbox_order_idx" ON "email_outbox" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "request_rate_limits_updated_at_idx" ON "request_rate_limits" USING btree ("updated_at");