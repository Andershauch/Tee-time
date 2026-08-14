import { describe, expect, it } from "vitest";
import { orderRequestSchema } from "../../lib/order-validation";

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
});
