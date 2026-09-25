import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LessonTimePicker, lessonTimeIssue } from "./lesson-time-picker";

const callbacks = {
  onDateChange: () => {},
  onStartChange: () => {},
  onEndChange: () => {},
};

describe("lesson time picker", () => {
  it("offers future half-hour starts and keeps precise minutes secondary", () => {
    const html = renderToStaticMarkup(<LessonTimePicker
      date="2026-09-25"
      start="10:30"
      end=""
      defaultDuration={120}
      now={new Date("2026-09-25T10:11:00")}
      {...callbacks}
    />);

    expect(html).toContain('min="2026-09-25"');
    expect(html).not.toContain('<option value="10:00">10:00</option>');
    expect(html).toContain('<option value="10:30" selected="">10:30</option>');
    expect(html).toContain('<option value="12:30" selected="">12:30</option>');
    expect(html).toContain("Need an exact minute?");
  });

  it("warns about a past start before the time can be saved", () => {
    const html = renderToStaticMarkup(<LessonTimePicker
      date="2026-09-25"
      start="09:30"
      end=""
      defaultDuration={120}
      now={new Date("2026-09-25T10:11:00")}
      {...callbacks}
    />);

    expect(html).toContain("Choose a future start time.");
  });

  it("keeps exact-minute lesson times available when the rounded choices do not fit", () => {
    const html = renderToStaticMarkup(<LessonTimePicker
      date="2026-09-26"
      start="16:20"
      end="18:20"
      defaultDuration={120}
      now={new Date("2026-09-25T10:11:00")}
      {...callbacks}
    />);

    expect(html).toContain('<option value="16:20" selected="">16:20 (exact)</option>');
    expect(html).toContain('<option value="18:20" selected="">18:20 (exact)</option>');
    expect(lessonTimeIssue({ date: "2026-09-26", start: "16:20", end: "18:20", defaultDuration: 120 }, new Date("2026-09-25T10:11:00"))).toBeNull();
  });
});
