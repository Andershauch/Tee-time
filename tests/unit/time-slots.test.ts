import { describe, expect, it } from "vitest";
import { minutesUntilTimeOfDay } from "../../lib/time-slots";

describe("checkout time conversion", () => {
  it("rounds a wall-clock slot up instead of moving it before opening time", () => {
    const now = new Date(2026, 7, 27, 9, 15, 35);
    expect(minutesUntilTimeOfDay("10:00", now)).toBe(45);
  });
});
