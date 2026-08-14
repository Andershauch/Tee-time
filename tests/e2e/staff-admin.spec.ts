import { expect, test } from "@playwright/test";

const staffEmail = process.env.TEST_STAFF_EMAIL!;
const staffPassword = process.env.TEST_STAFF_PASSWORD!;
const adminEmail = process.env.TEST_ADMIN_EMAIL!;
const adminPassword = process.env.TEST_ADMIN_PASSWORD!;

async function signIn(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/auth/sign-in");
  const response = await page.request.post("/api/staff/session", {
    headers: { Origin: "http://localhost:3000" },
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
  const response = await page.request.patch("/api/admin/catalog", { headers: { Origin: "http://localhost:3000" }, data: { kind: "product", id: "product-burger-klub", patch: { priceOre: 1 } } });
  expect(response.status()).toBe(403);
});

test("two staff tablets cannot silently overwrite the same status", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "tablet-chromium", "One concurrent tablet scenario is sufficient.");
  await signIn(page, staffEmail, staffPassword);
  const created = await page.evaluate(async () => {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), placement: "klubhus", requestedMinutes: 30, locationDetail: "", customerName: "Samtidighedstest", phone: "", lines: [{ productId: "burger-klub", quantity: 1, options: [], note: "" }] }),
    });
    return { status: response.status, body: await response.json() as { orderNumber: string } };
  });
  expect(created.status).toBe(201);
  const list = await page.request.get("/api/staff/orders?scope=active");
  const order = (await list.json() as { orders: Array<{ id: string; orderNumber: string; version: number }> }).orders.find((entry) => entry.orderNumber === created.body.orderNumber);
  expect(order).toBeTruthy();
  const payload = { expectedVersion: order!.version, status: "approved" };
  const patch = () => page.request.patch(`/api/staff/orders/${order!.id}`, { headers: { Origin: "http://localhost:3000" }, data: payload });
  const [first, second] = await Promise.all([patch(), patch()]);
  expect([first.status(), second.status()].sort()).toEqual([200, 409]);
});

test("an admin user can open menuadmin and publish a server-validated menu price", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "tablet-chromium", "One tablet admin mutation is sufficient.");
  await signIn(page, adminEmail, adminPassword);
  await page.goto("/menuadmin");
  await expect(page.getByRole("heading", { name: "Menu og tilbud" })).toBeVisible();
  const product = page.locator(".admin-row").filter({ has: page.locator('input[name="name"][value="Klubhusburger"]') }).first();
  page.once("dialog", (dialog) => void dialog.accept());
  await product.getByLabel("Pris, kr.").fill("146");
  await product.getByRole("button", { name: "Gem" }).click();
  await expect(page.getByRole("status")).toContainText("Ændringen er gemt");
  await page.goto("/menu");
  await expect(page.getByText("146 kr.")).toBeVisible();
  await page.goto("/menuadmin");
  const restore = page.locator(".admin-row").filter({ has: page.locator('input[name="name"][value="Klubhusburger"]') }).first();
  await restore.getByLabel("Pris, kr.").fill("145");
  await restore.getByRole("button", { name: "Gem" }).click();
});
