import { describe, expect, it } from "vitest";
import { orderRequestSchema } from "../../lib/order-validation";
import { isValidPhone } from "../../lib/phone";

const validOrder = {
  idempotencyKey: "a24f7918-5fa4-4a95-9815-3f7f1cd7bd1d",
  placement: "klubhus" as const,
  requestedMinutes: 30 as const,
  customerName: "Testgæst",
  lines: [{ productId: "burger-klub", quantity: 1, options: [], note: "" }],
};

describe("orderRequestSchema", () => {
  it("rejects client payloads with duplicate options or lines", () => {
    expect(orderRequestSchema.safeParse({ ...validOrder, lines: [{ ...validOrder.lines[0], options: ["Ekstra bacon", "Ekstra bacon"] }] }).success).toBe(false);
    expect(orderRequestSchema.safeParse({ ...validOrder, lines: [validOrder.lines[0], validOrder.lines[0]] }).success).toBe(false);
  });

  it("requires the data needed for terrace and fairway orders", () => {
    expect(orderRequestSchema.safeParse({ ...validOrder, placement: "terrasse" }).success).toBe(false);
    expect(orderRequestSchema.safeParse({ ...validOrder, placement: "bane" }).success).toBe(false);
    expect(orderRequestSchema.safeParse({ ...validOrder, placement: "terrasse", locationDetail: "Bord 12" }).success).toBe(true);
  });

  it("rejects a fairway order whose phone number isn't shaped like one", () => {
    const baneOrder = { ...validOrder, placement: "bane" as const };
    expect(orderRequestSchema.safeParse({ ...baneOrder, phone: "abcdefg" }).success).toBe(false);
    expect(orderRequestSchema.safeParse({ ...baneOrder, phone: "1234" }).success).toBe(false);
    expect(orderRequestSchema.safeParse({ ...baneOrder, phone: "12345678" }).success).toBe(true);
    expect(orderRequestSchema.safeParse({ ...baneOrder, phone: "+45 12 34 56 78" }).success).toBe(true);
  });
});

describe("isValidPhone", () => {
  it("accepts plausible phone numbers and rejects everything else", () => {
    expect(isValidPhone("12345678")).toBe(true);
    expect(isValidPhone("+45 12 34 56 78")).toBe(true);
    expect(isValidPhone("(45) 1234-5678")).toBe(true);
    expect(isValidPhone("1234")).toBe(false);
    expect(isValidPhone("not a phone")).toBe(false);
    expect(isValidPhone("")).toBe(false);
  });
});
