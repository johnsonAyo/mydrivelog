import { describe, expect, it } from "vitest";
import { canLearnerChange, hasBookingNotice, weeklyBookingLimit } from "./booking-policy";

describe("collection booking rules", () => {
  it("maps every supported weekly limit and treats unlimited as no cap", () => {
    expect(["one", "two", "three", "four", "five"].map(weeklyBookingLimit)).toEqual([1, 2, 3, 4, 5]);
    expect(weeklyBookingLimit("unlimited")).toBeNull();
  });

  it("requires the full configured notice before a learner can book", () => {
    const now = new Date("2026-09-25T09:00:00.000Z");
    expect(hasBookingNotice("2026-09-26T09:00:00.000Z", 24, now)).toBe(false);
    expect(hasBookingNotice("2026-09-26T09:01:00.000Z", 24, now)).toBe(true);
  });

  it("lets a learner change a lesson at 48 hours but not within it", () => {
    const now = new Date("2026-09-25T09:00:00.000Z");
    expect(canLearnerChange("2026-09-27T09:00:00.000Z", now)).toBe(true);
    expect(canLearnerChange("2026-09-27T08:59:00.000Z", now)).toBe(false);
  });
});
