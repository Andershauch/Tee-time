import { expect, test } from "@playwright/test";
import { neon } from "@neondatabase/serverless";
import { testOrigin, testRequestedMinutes } from "./test-config";

test("the protected cron anonymizes customer data and invalidates status access after 30 days", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "tablet-chromium", "One shared database retention scenario is sufficient.");
  test.skip(!process.env.DATABASE_URL || !process.env.CRON_SECRET || process.env.DEPLOYMENT_ENV !== "local", "Retention integration test only uses explicit local credentials.");
  const created = await page.request.post("/api/orders", {
    headers: { Origin: testOrigin },
    data: { idempotencyKey: crypto.randomUUID(), placement: "terrasse", requestedMinutes: testRequestedMinutes(), locationDetail: "Privat bord", customerName: "Retention test", phone: "", lines: [{ productId: "burger-klub", quantity: 1, options: [], note: "Privat bemærkning" }] },
  });
  expect(created.status()).toBe(201);
  const order = await created.json() as { token: string; orderNumber: string };
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql.query("SELECT id, guest_session_id FROM orders WHERE order_number = $" + "1", [order.orderNumber.replace("TT-", "")]);
  expect(rows).toHaveLength(1);
  const orderId = rows[0]!.id as string;
  const sessionId = rows[0]!.guest_session_id as string;
  await Promise.all([
    sql.query("UPDATE orders SET created_at = now() - interval '31 days' WHERE id = $" + "1", [orderId]),
    sql.query("UPDATE guest_sessions SET expires_at = now() - interval '31 days' WHERE id = $" + "1", [sessionId]),
  ]);

  const cron = await page.request.get("/api/internal/email-retry", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
  expect(cron.status()).toBe(200);
  const anonymized = await sql.query("SELECT customer_name, phone, location_detail, guest_session_id, anonymized_at FROM orders WHERE id = $" + "1", [orderId]);
  const items = await sql.query("SELECT note FROM order_items WHERE order_id = $" + "1", [orderId]);
  const sessions = await sql.query("SELECT id FROM guest_sessions WHERE id = $" + "1", [sessionId]);
  expect(anonymized[0]).toMatchObject({ customer_name: "Anonymiseret", phone: null, location_detail: null, guest_session_id: null });
  expect(anonymized[0]!.anonymized_at).toBeTruthy();
  expect(items[0]!.note).toBe("");
  expect(sessions).toHaveLength(0);
  expect((await page.request.post("/api/orders/status", { data: { token: order.token } })).status()).toBe(404);
});
