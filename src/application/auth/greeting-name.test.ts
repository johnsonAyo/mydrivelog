import { describe, expect, it } from "vitest";
import { greetingNameFromEmail } from "./greeting-name";

describe("greetingNameFromEmail", () => {
  it.each([
    ["sarah@example.com", "Sarah"],
    ["sarah.jones@example.com", "Sarah"],
    ["sarah_jones@example.com", "Sarah"],
    ["sarah-jones@example.com", "Sarah"],
    ["sarah+drivetrack@example.com", "Sarah"],
    ["sarah2024@example.com", "Sarah"],
    ["88sarah@example.com", "Sarah"],
    ["SARAH.JONES@example.com", "Sarah"],
    ["  zoë.smith@example.co.uk ", "Zoë"],
  ])("greets %s as %s", (email, expected) => {
    expect(greetingNameFromEmail(email)).toBe(expected);
  });

  it.each([
    [null],
    [undefined],
    [""],
    ["j@example.com"],
    ["j.smith@example.com"],
    ["12345@example.com"],
    ["info@sarahsdriving.co.uk"],
    ["Bookings+web@sarahsdriving.co.uk"],
    ["hello@example.com"],
  ])("returns null for %s so the caller shows a neutral greeting", (email) => {
    expect(greetingNameFromEmail(email)).toBeNull();
  });
});
