import { describe, expect, it } from "vitest";
import { addCalendarDays, isMonday, isWithinWeek, mondayOf, weekLabel, weeksTouchingMonth } from "./week";

describe("calendar weeks", () => {
  it("uses Monday–Sunday weeks and includes every week touching a month", () => {
    expect(mondayOf("2026-09-25")).toBe("2026-09-21");
    expect(isMonday("2026-09-21")).toBe(true);
    expect(isMonday("2026-09-25")).toBe(false);
    expect(weeksTouchingMonth("2026-09")).toEqual(["2026-08-31", "2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28"]);
    expect(weeksTouchingMonth("2026-03")).toHaveLength(6);
    expect(weekLabel("2026-09-28")).toBe("28 Sept–4 Oct 2026");
    expect(weekLabel("2026-12-28")).toBe("28 Dec 2026–3 Jan 2027");
    expect(addCalendarDays("2026-12-29", 6)).toBe("2027-01-04");
  });

  it("checks a lesson against the instructor's local week", () => {
    expect(isWithinWeek(new Date("2026-09-27T22:30:00.000Z"), "2026-09-21", "Europe/London")).toBe(true);
    expect(isWithinWeek(new Date("2026-09-27T23:30:00.000Z"), "2026-09-21", "Europe/London")).toBe(false);
  });
});
