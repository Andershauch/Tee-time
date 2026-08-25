CREATE TABLE "print_outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"ticket_type" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"printer_target" text,
	"provider_job_id" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"locked_at" timestamp with time zone,
	"last_error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "print_outbox_type_valid" CHECK ("print_outbox"."ticket_type" IN ('kitchen_ticket')),
	CONSTRAINT "print_outbox_status_valid" CHECK ("print_outbox"."status" IN ('pending', 'processing', 'sent', 'failed', 'blocked')),
	CONSTRAINT "print_outbox_attempts_non_negative" CHECK ("print_outbox"."attempts" >= 0)
);
--> statement-breakpoint
ALTER TABLE "print_outbox" ADD CONSTRAINT "print_outbox_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "print_outbox_idempotency_unique" ON "print_outbox" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "print_outbox_delivery_idx" ON "print_outbox" USING btree ("status","next_attempt_at","created_at");--> statement-breakpoint
CREATE INDEX "print_outbox_order_idx" ON "print_outbox" USING btree ("order_id");