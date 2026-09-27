import { describe, expect, it } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";
import { safeMonitoringPath, sanitizeSentryEvent } from "./sentry-privacy";

describe("monitoring privacy", () => {
  it("removes invitation tokens, addresses and source context from error events", () => {
    const token = "a".repeat(48);
    const event = sanitizeSentryEvent({
      message: `Booking failed for learner@example.com at /book/${token}`,
      user: { email: "learner@example.com" },
      request: { url: `https://mydrivelog.co.uk/book/${token}?email=learner@example.com`, method: "POST", data: { note: "private" } },
      exception: { values: [{ value: `Could not send to learner@example.com`, stacktrace: { frames: [{ filename: `/book/${token}`, context_line: "private lesson note", vars: { note: "private" } }] } }] },
    } as unknown as ErrorEvent);

    const serialized = JSON.stringify(event);
    expect(serialized).not.toContain("learner@example.com");
    expect(serialized).not.toContain(token);
    expect(serialized).not.toContain("private lesson note");
    expect(serialized).not.toContain('"note":"private"');
    expect(event.request?.url).toBe("/[private-link]");
  });

  it("strips query strings from monitoring paths", () => {
    expect(safeMonitoringPath("/api/v1/ready?code=123456")).toBe("/api/v1/ready");
  });
});
