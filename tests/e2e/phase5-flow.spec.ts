import { expect, test } from "@playwright/test";
import { neon } from "@neondatabase/serverless";
import { testOrigin, testRequestedMinutes } from "./test-config";

test("guest order, staff approval, guest status and outbox form one auditable flow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "tablet-chromium", "One shared database flow is sufficient.");
  const created = await page.request.post("/api/orders", {
    headers: { Origin: testOrigin },
    data: {
      idempotencyKey: crypto.randomUUID(), placement: "klubhus", requestedMinutes: testRequestedMinutes(), locationDetail: "", customerName: "Fase fem test", phone: "",
      lines: [{ productId: "burger-klub", quantity: 1, options: [], note: "" }],
    },
  });
  expect(created.status()).toBe(201);
  const guestOrder = await created.json() as { token: string; orderNumber: string };

  const login = await page.request.post("/api/staff/session", {
    headers: { Origin: testOrigin },
    data: { email: process.env.TEST_STAFF_EMAIL, password: process.env.TEST_STAFF_PASSWORD },
  });
  expect(login.status()).toBe(200);
  const staffOrders = await page.request.get("/api/staff/orders?scope=active");
  const staffOrder = (await staffOrders.json() as { orders: Array<{ id: string; orderNumber: string; version: number }> }).orders.find((order) => order.orderNumber === guestOrder.orderNumber);
  expect(staffOrder).toBeTruthy();
  const approval = await page.request.patch(`/api/staff/orders/${staffOrder!.id}`, {
    headers: { Origin: testOrigin }, data: { expectedVersion: staffOrder!.version, status: "approved" },
  });
  expect(approval.status()).toBe(200);

  const status = await page.request.post("/api/orders/status", { data: { token: guestOrder.token } });
  expect(status.status()).toBe(200);
  expect((await status.json() as { status: string }).status).toBe("approved");

  if (process.env.DEPLOYMENT_ENV === "local" && process.env.DATABASE_URL) {
    const rows = await neon(process.env.DATABASE_URL).query("SELECT status FROM email_outbox WHERE order_id = $" + "1 LIMIT 1", [staffOrder!.id]);
    expect(rows).toHaveLength(1);
    expect(["pending", "processing", "sent", "failed", "blocked"]).toContain(rows[0]!.status);
  }
});
