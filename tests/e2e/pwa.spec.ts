import { expect, test } from "@playwright/test";
import { testOrigin } from "./test-config";

test("guest PWA registers and falls back conservatively when offline", async ({ context, page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "One service-worker lifecycle is sufficient.");
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const response = await page.goto("/");
  expect(response?.headers()["content-security-policy"]).toContain("default-src 'self'");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  await expect(page.getByRole("heading", { name: "Banebestilling" })).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready.then((registration) => registration.scope));
  await context.setOffline(true);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Du er offline" })).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test("iPad back-office pages publish their own install profiles", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "tablet-chromium", "Back-office manifests are tablet-specific.");
  const staffLogin = await page.request.post("/api/staff/session", {
    headers: { Origin: testOrigin },
    data: { email: process.env.TEST_STAFF_EMAIL, password: process.env.TEST_STAFF_PASSWORD },
  });
  expect(staffLogin.status()).toBe(200);
  await page.goto("/personale");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/personale.webmanifest");

  const adminLogin = await page.request.post("/api/staff/session", {
    headers: { Origin: testOrigin },
    data: { email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD },
  });
  expect(adminLogin.status()).toBe(200);
  await page.goto("/menuadmin");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/menuadmin.webmanifest");
});
