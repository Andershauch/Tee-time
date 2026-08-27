import { describe, expect, it } from "vitest";
import { hasTrustedMutationOrigin } from "../../lib/request-origin-validation";

describe("trusted mutation origins", () => {
  it("accepts the origin that the request actually reached", () => {
    const request = new Request("https://preview.example/api/orders", {
      headers: { Origin: "https://preview.example" },
    });
    expect(hasTrustedMutationOrigin(request, "https://canonical.example")).toBe(true);
  });

  it("accepts a public reverse-proxy origin", () => {
    const request = new Request("http://internal:3000/api/orders", {
      headers: {
        Origin: "https://tee-time.example",
        "X-Forwarded-Host": "tee-time.example",
        "X-Forwarded-Proto": "https",
      },
    });
    expect(hasTrustedMutationOrigin(request)).toBe(true);
  });

  it("rejects missing, malformed and cross-origin values", () => {
    expect(hasTrustedMutationOrigin(new Request("https://tee-time.example/api/orders"))).toBe(false);
    expect(hasTrustedMutationOrigin(new Request("https://tee-time.example/api/orders", { headers: { Origin: "not-a-url" } }))).toBe(false);
    expect(hasTrustedMutationOrigin(new Request("https://tee-time.example/api/orders", { headers: { Origin: "https://attacker.example" } }))).toBe(false);
    expect(hasTrustedMutationOrigin(new Request("https://tee-time.example/api/orders", {
      headers: { Host: "tee-time.example", Origin: "https://attacker.example", "X-Forwarded-Host": "attacker.example" },
    }))).toBe(false);
  });
});
