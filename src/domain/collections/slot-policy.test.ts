import { describe, expect, it } from "vitest";
import { generateExactSlots, nearbyGapWarning, slotsOverlap } from "./slot-policy";

describe("exact lesson slots", () => {
  it("generates two-hour lessons with the configured gap", () => {
    const slots = generateExactSlots({ startsAt: new Date("2026-09-28T08:00:00Z"), endsAt: new Date("2026-09-28T15:00:00Z") }, 120, 30);
    expect(slots.map((slot) => [slot.startsAt.toISOString(), slot.endsAt.toISOString()])).toEqual([
      ["2026-09-28T08:00:00.000Z", "2026-09-28T10:00:00.000Z"],
      ["2026-09-28T10:30:00.000Z", "2026-09-28T12:30:00.000Z"],
      ["2026-09-28T13:00:00.000Z", "2026-09-28T15:00:00.000Z"],
    ]);
  });

  it("warns about a short gap but treats only an actual overlap as a conflict", () => {
    const first = { startsAt: new Date("2026-09-28T08:00:00Z"), endsAt: new Date("2026-09-28T10:00:00Z") };
    const next = { startsAt: new Date("2026-09-28T10:15:00Z"), endsAt: new Date("2026-09-28T12:15:00Z") };
    expect(slotsOverlap(first, next)).toBe(false);
    expect(nearbyGapWarning(next, [first], 30)).toContain("30-minute gap");
  });
});
