import { beforeEach, describe, expect, it } from "vitest";
import { SPIKE_COOLDOWN_MS, SPIKE_THRESHOLD, SPIKE_WINDOW_MS, expectedErrorGroup, formatSpike, recordExpectedError, resetExpectedErrorSpikes } from "./expected-error-spikes";

describe("expected-error spikes", () => {
  beforeEach(() => resetExpectedErrorSpikes());

  it("groups the expected errors J asked about and ignores routine noise", () => {
    expect(expectedErrorGroup(400, "invalid_code")).toBe("sign_in");
    expect(expectedErrorGroup(404, "not_found")).toBe("link");
    expect(expectedErrorGroup(409, "unavailable")).toBe("slot");
    expect(expectedErrorGroup(400, "invalid_email")).toBe("validation");
    expect(expectedErrorGroup(401, "unauthenticated")).toBeNull();
    expect(expectedErrorGroup(403, "read_only")).toBeNull();
    expect(expectedErrorGroup(500, "invalid_code")).toBeNull();
  });

  it("alerts once when a group reaches the threshold inside the window", () => {
    const start = 1_000_000;
    for (let i = 0; i < SPIKE_THRESHOLD - 1; i += 1) expect(recordExpectedError(400, "invalid_code", start + i)).toBeNull();
    const spike = recordExpectedError(429, "code_rate_limited", start + SPIKE_THRESHOLD);
    expect(spike).toEqual({ group: "sign_in", count: SPIKE_THRESHOLD, codes: [["invalid_code", SPIKE_THRESHOLD - 1], ["code_rate_limited", 1]] });
    expect(recordExpectedError(400, "invalid_code", start + SPIKE_THRESHOLD + 1)).toBeNull();
  });

  it("does not alert for errors spread wider than the window", () => {
    for (let i = 0; i < SPIKE_THRESHOLD * 2; i += 1) expect(recordExpectedError(404, "not_found", i * (SPIKE_WINDOW_MS / (SPIKE_THRESHOLD - 2)))).toBeNull();
  });

  it("alerts again only after the cooldown", () => {
    for (let i = 0; i < SPIKE_THRESHOLD; i += 1) recordExpectedError(409, "unavailable", i);
    const later = SPIKE_COOLDOWN_MS + SPIKE_THRESHOLD;
    let spike = null;
    for (let i = 0; i < SPIKE_THRESHOLD && !spike; i += 1) spike = recordExpectedError(409, "unavailable", later + i);
    expect(spike?.group).toBe("slot");
  });

  it("formats a message with no personal data", () => {
    const text = formatSpike({ group: "link", count: 25, codes: [["not_found", 25]] }, "production");
    expect(text).toBe("⚠️ MyDriveLog expected-error spike (PRODUCTION)\nWhat: Links not found or expired\nCount: 25 in 10 min on one server instance\nCodes: not_found ×25");
  });
});
