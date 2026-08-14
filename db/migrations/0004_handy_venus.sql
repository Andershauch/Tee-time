CREATE UNIQUE INDEX IF NOT EXISTS "orders_session_idempotency_unique" ON "orders" USING btree ("guest_session_id","idempotency_key");
