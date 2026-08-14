import "server-only";

type EventName = "email_delivery_failed" | "email_delivery_sent" | "email_retry_unauthorized" | "order_create_failed" | "cron_failed";

/** Logs only an allowlisted operational envelope; never attach request or provider bodies. */
export function logOperationalEvent(event: EventName, fields: { outboxId?: string; orderId?: string; code?: string; status?: number } = {}) {
  console.info(JSON.stringify({ service: "tee-time", event, ...fields }));
}
