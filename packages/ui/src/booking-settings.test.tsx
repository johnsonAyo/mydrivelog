import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SchedulingSettingsForm } from "./booking";

describe("scheduling settings", () => {
  it("uses human-readable hours and exposes the agreed booking rules", () => {
    const html = renderToStaticMarkup(<SchedulingSettingsForm settings={{
      name: "Avery Instructor", timezone: "Europe/London", defaultSessionMinutes: 120,
      bufferWarningMinutes: 30, weeklyBookingAllowance: "two", minimumBookingNoticeHours: 24, contactPhone: null,
    }} onSave={async () => {}} />);

    expect(html).toContain("¾ hour");
    expect(html).toContain("2 hours");
    expect(html).toContain("Five lessons");
    expect(html).toContain("No limit");
    expect(html).toContain("Minimum booking notice");
    expect(html).toContain("Contact phone (optional)");
    expect(html).not.toContain("Instructor display name");
  });
});
