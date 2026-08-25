import { expect, test } from "@playwright/test";

test("server ignores forged prices and a first-visit double submit creates one order", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== "tablet-chromium", "One server-side price/idempotency scenario is sufficient.");
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/");
  const body = { idempotencyKey: crypto.randomUUID(), placement: "klubhus", requestedMinutes: 30, locationDetail: "", customerName: "Pris-test", phone: "", totalOre: 1, lines: [{ productId: "burger-klub", quantity: 1, options: ["Ekstra bacon"], note: "", unitPriceOre: 1 }] };
  const post = () => page.request.post("/api/orders", { headers: { Origin: "http://localhost:3000" }, data: body });
  const [first, second] = await Promise.all([post(), post()]);
  const created = first.status() === 201 ? await first.json() as { token: string } : await second.json() as { token: string };
  const status = await page.request.post("/api/orders/status", { data: { token: created.token } });
  const unknown = await page.request.post("/api/orders/status", { data: { token: "not-a-valid-order-token" } });
  const result = { statuses: [first.status(), second.status()].sort(), order: await status.json(), statusCache: status.headers()["cache-control"], unknownStatus: unknown.status(), unknownCache: unknown.headers()["cache-control"] };
  expect(result.statuses).toEqual([201, 409]);
  const firstLine = result.order.items[0];
  expect(firstLine.unitPriceOre).not.toBe(1);
  expect(firstLine.options[0].priceDeltaOre).not.toBe(1);
  expect(result.order.totalOre).toBe(firstLine.unitPriceOre + firstLine.options[0].priceDeltaOre);
  expect(result.statusCache).toContain("no-store");
  expect(result.unknownStatus).toBe(404);
  expect(result.unknownCache).toContain("no-store");
  await context.close();
});

test("creates and reopens a real guest order", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.getByRole("link", { name: "Bestil" }).click();
  await page.getByRole("link", { name: /Klubhusburger/ }).click();
  await page.getByRole("button", { name: /Læg i kurv/ }).click();
  await page.getByRole("link", { name: /Kurv med 1 varer/ }).click();
  await page.getByRole("link", { name: "Fortsæt til bestilling" }).click();
  const timeOptions = await page.locator("select").first().locator("option").allTextContents();
  await page.locator("select").first().selectOption(timeOptions[1]);
  await page.getByLabel("Navn").fill("Testgæst");
  await page.getByLabel("Mobilnummer").fill("12345678");
  await page.getByRole("button", { name: "Send ordre til restauranten" }).click();

  await expect(page.getByRole("heading", { name: "Din ordre er modtaget" })).toBeVisible();
  await page.getByRole("link", { name: "Se ordrestatus" }).click();
  await expect(page.getByRole("heading", { name: "Din ordre" })).toBeVisible();
  await expect(page.getByText(/TT-\d{4,}/)).toBeVisible();

  await page.goto("/tidligere");
  await expect(page.getByRole("heading", { name: "Tidligere bestillinger" })).toBeVisible();
  await page.getByRole("link", { name: /TT-\d{4,}/ }).click();
  await expect(page.getByRole("heading", { name: "Din ordre" })).toBeVisible();
});
