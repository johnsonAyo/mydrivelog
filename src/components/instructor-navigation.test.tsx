import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProductShell } from "@drivetrack/ui";
import { instructorNavigation, type InstructorSection } from "./instructor-navigation";

describe("instructor navigation", () => {
  it.each(["today", "calendar", "learners", "scheduling"] as InstructorSection[])("keeps every destination visible on %s", (section) => {
    const html = renderToStaticMarkup(<ProductShell brand="MyDriveLog" navigation={instructorNavigation(section)} title="Test"><p>Content</p></ProductShell>);
    for (const href of ["/today", "/calendar", "/learners", "/settings/scheduling"]) {
      expect(html).toContain(`href="${href}"`);
    }
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });
});
