import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { hasValidCronSecret } from "../../lib/cron-auth";
import { buildBrevoPayload } from "../../lib/brevo-payload";
import { getBrevoDeliveryMode } from "../../lib/brevo-config";

afterEach(() => vi.unstubAllEnvs());

describe("phase 5 delivery boundaries", () => {
  it("uses Brevo's no-delivery sandbox header", () => {
    const payload = buildBrevoPayload({ mode: "sandbox", senderEmail: "sender@example.test", recipient: "restaurant@example.test", subject: "Ny ordre", text: "tekst", html: "<p>tekst</p>" });
    expect(payload.headers).toEqual({ "X-Sib-Sandbox": "drop" });
    expect(payload.tags).toContain("sandbox");
  });

  it("fails closed for an unknown Brevo delivery mode", () => {
    vi.stubEnv("BREVO_DELIVERY_MODE", "sanbox");
    expect(getBrevoDeliveryMode()).toBe("disabled");
    vi.stubEnv("BREVO_DELIVERY_MODE", "sandbox");
    expect(getBrevoDeliveryMode()).toBe("sandbox");
  });

  it("requires a timing-safe cron secret", () => {
    vi.stubEnv("CRON_SECRET", "test-secret");
    expect(hasValidCronSecret(new Request("https://example.test/api/internal/email-retry", { headers: { authorization: "Bearer test-secret" } }))).toBe(true);
    expect(hasValidCronSecret(new Request("https://example.test/api/internal/email-retry", { headers: { authorization: "Bearer wrong" } }))).toBe(false);
  });

  it("keeps the service worker away from sensitive routes and APIs", () => {
    const worker = readFileSync("public/sw.js", "utf8");
    expect(worker).toContain("/^\\/api\\//");
    expect(worker).toContain("/^\\/personale");
    expect(worker).toContain('caches.match("/offline")');
  });

  it("records the outbox inside the order transaction", () => {
    const orders = readFileSync("lib/orders.ts", "utf8");
    expect(orders).toContain("tx.insert(emailOutbox)");
    expect(orders).toContain("restaurant-new-order:");
  });
});
