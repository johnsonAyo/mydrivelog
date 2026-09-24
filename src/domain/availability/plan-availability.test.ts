import { describe, expect, it } from "vitest";
import { planAvailability } from "./plan-availability";

const defaultPolicy = {
  defaultSessionMinutes: 120,
  bufferWarningMinutes: 30,
} as const;

describe("planAvailability", () => {
  it("uses the instructor's two-hour default when no end is supplied", () => {
    const result = planAvailability({
      startsAt: new Date("2026-10-05T09:00:00.000Z"),
      policy: defaultPolicy,
      nearbySlots: [],
    });

    expect(result).toEqual({
      ok: true,
      value: {
        startsAt: new Date("2026-10-05T09:00:00.000Z"),
        endsAt: new Date("2026-10-05T11:00:00.000Z"),
        warnings: [],
      },
    });
  });

  it("retains a custom duration on the slot", () => {
    const result = planAvailability({
      startsAt: new Date("2026-10-05T09:00:00.000Z"),
      endsAt: new Date("2026-10-05T10:30:00.000Z"),
      policy: defaultPolicy,
      nearbySlots: [],
    });

    expect(result.ok && result.value.endsAt.toISOString()).toBe("2026-10-05T10:30:00.000Z");
  });

  it("rejects a real overlap", () => {
    const result = planAvailability({
      startsAt: new Date("2026-10-05T10:30:00.000Z"),
      endsAt: new Date("2026-10-05T12:00:00.000Z"),
      policy: defaultPolicy,
      nearbySlots: [
        {
          id: "slot-existing",
          startsAt: new Date("2026-10-05T09:00:00.000Z"),
          endsAt: new Date("2026-10-05T11:00:00.000Z"),
        },
      ],
    });

    expect(result).toEqual({
      ok: false,
      error: { code: "overlap", conflictingSlotId: "slot-existing" },
    });
  });

  it("returns a buffer warning without blocking the plan", () => {
    const result = planAvailability({
      startsAt: new Date("2026-10-05T11:20:00.000Z"),
      policy: defaultPolicy,
      nearbySlots: [
        {
          id: "slot-before",
          startsAt: new Date("2026-10-05T09:00:00.000Z"),
          endsAt: new Date("2026-10-05T11:00:00.000Z"),
        },
      ],
    });

    expect(result).toEqual({
      ok: true,
      value: {
        startsAt: new Date("2026-10-05T11:20:00.000Z"),
        endsAt: new Date("2026-10-05T13:20:00.000Z"),
        warnings: [
          {
            code: "short_buffer",
            adjacentSlotId: "slot-before",
            gapMinutes: 20,
            preferredMinutes: 30,
            side: "before",
          },
        ],
      },
    });
  });
});
