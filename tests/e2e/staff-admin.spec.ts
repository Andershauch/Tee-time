import { expect, test } from "@playwright/test";
import { testOrigin, testRequestedMinutes } from "./test-config";

const staffEmail = process.env.TEST_STAFF_EMAIL!;
const staffPassword = process.env.TEST_STAFF_PASSWORD!;
const adminEmail = process.env.TEST_ADMIN_EMAIL!;
const adminPassword = process.env.TEST_ADMIN_PASSWORD!;

async function signIn(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/auth/sign-in");
  const response = await page.request.post("/api/staff/session", {
    headers: { Origin: testOrigin },
    data: { email, password },
  });
  expect(response.status()).toBe(200);
  await page.goto("/personale");
  await expect(page).toHaveURL(/\/personale/, { timeout: 15_000 });
}

test("an anonymous session cannot open staff data", async ({ page }) => {
  await page.goto("/menuadmin");
  await expect(page).toHaveURL(/\/auth\/sign-in/);
  const response = await page.request.get("/api/staff/orders");
  expect(response.status()).toBe(401);
});

test("a staff user can process an order but cannot administer the menu", async ({ page }) => {
  await signIn(page, staffEmail, staffPassword);
  await expect(page.getByRole("heading", { name: "Aktive ordrer" })).toBeVisible();
  await page.goto("/menuadmin");
  await expect(page).toHaveURL(/\/adgang-naegtet/);
  const response = await page.request.patch("/api/admin/catalog", { headers: { Origin: testOrigin }, data: { kind: "product", id: "product-burger-klub", patch: { priceOre: 1 } } });
  expect(response.status()).toBe(403);
});

test("two staff tablets cannot silently overwrite the same status", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "tablet-chromium", "One concurrent tablet scenario is sufficient.");
  await signIn(page, staffEmail, staffPassword);
  const created = await page.evaluate(async (requestedMinutes) => {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), placement: "klubhus", requestedMinutes, locationDetail: "", customerName: "Samtidighedstest", phone: "", lines: [{ productId: "burger-klub", quantity: 1, options: [], note: "" }] }),
    });
    return { status: response.status, body: await response.json() as { orderNumber: string } };
  }, testRequestedMinutes());
  expect(created.status).toBe(201);
  const list = await page.request.get("/api/staff/orders?scope=active");
  const order = (await list.json() as { orders: Array<{ id: string; orderNumber: string; version: number }> }).orders.find((entry) => entry.orderNumber === created.body.orderNumber);
  expect(order).toBeTruthy();
  const payload = { expectedVersion: order!.version, status: "approved" };
  const patch = () => page.request.patch(`/api/staff/orders/${order!.id}`, { headers: { Origin: testOrigin }, data: payload });
  const [first, second] = await Promise.all([patch(), patch()]);
  expect([first.status(), second.status()].sort()).toEqual([200, 409]);
});

test("an admin user can open menuadmin and publish a server-validated menu price", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "tablet-chromium", "One tablet admin mutation is sufficient.");
  await signIn(page, adminEmail, adminPassword);
  await page.goto("/menuadmin");
  await expect(page.getByRole("heading", { name: "Menuadministration" })).toBeVisible();
  const price = page.getByLabel("Pris på Klubhusburger");
  const originalPrice = await price.inputValue();
  const changedPrice = originalPrice === "146.00" ? "147" : "146";
  const save = page.waitForResponse((response) => response.url().endsWith("/api/admin/catalog") && response.request().method() === "PATCH");
  await price.fill(changedPrice);
  await price.press("Tab");
  expect((await save).status()).toBe(200);
  try {
    await page.goto("/menu");
    await expect(page.getByText(`${changedPrice} kr.`)).toBeVisible();
  } finally {
    await page.goto("/menuadmin");
    const restore = page.getByLabel("Pris på Klubhusburger");
    const restored = page.waitForResponse((response) => response.url().endsWith("/api/admin/catalog") && response.request().method() === "PATCH");
    await restore.fill(originalPrice);
    await restore.press("Tab");
    expect((await restored).status()).toBe(200);
  }
});
