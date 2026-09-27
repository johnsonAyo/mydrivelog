import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./test-workspace", () => ({
  isMonitoringWorkspace: vi.fn(async (id?: string) => id === "11111111-1111-4111-8111-111111111111"),
  bookingOwner: vi.fn(async () => ({ workspaceId: "11111111-1111-4111-8111-111111111111", instructorName: "Sam Taylor" })),
}));

const { formatActivity, formatCritical, queueActivity } = await import("./telegram");
const { hasMonitoringSecret, validSentrySignature } = await import("./secret");

const pilot = { workspaceId: "22222222-2222-4222-8222-222222222222", instructorName: "Priya Shah" };

describe("Telegram activity", () => {
  beforeEach(() => { process.env.MONITORING_ENVIRONMENT = "staging"; });
  afterEach(() => { delete process.env.MONITORING_ENVIRONMENT; vi.unstubAllGlobals(); });

  it("names the environment, action and instructor first name, with a safe ref only", async () => {
    const text = await formatActivity({ action: "week_created", reference: "33333333-3333-4333-8333-333333333333", actor: pilot });
    expect(text).toBe("📣 MyDriveLog activity (STAGING)\nAction: Created an availability week\nInstructor: Priya\nRef: 33333333-3333-4333-8333-333333333333");
  });

  it("drops references that are not internal ids, such as booking tokens or emails", async () => {
    const text = await formatActivity({ action: "learner_created", reference: "learner@example.com", actor: pilot });
    expect(text).not.toContain("example.com");
    expect(text).not.toContain("Ref:");
  });

  it("marks the monitoring workspace [TEST] and resolves learner-side bookings to the instructor", async () => {
    const text = await formatActivity({ action: "booking_confirmed", reference: "44444444-4444-4444-8444-444444444444", bookingId: "44444444-4444-4444-8444-444444444444" });
    expect(text.split("\n")[0]).toBe("📣 MyDriveLog activity (STAGING) [TEST]");
    expect(text).toContain("Action: Learner booked a lesson");
    expect(text).toContain("Instructor: Sam");
  });

  it("uses the signup heading for a finished signup", async () => {
    expect((await formatActivity({ action: "instructor_signed_up", actor: pilot })).split("\n")[0]).toBe("🆕 MyDriveLog new signup (STAGING)");
  });

  it("never sends from local development", () => {
    delete process.env.MONITORING_ENVIRONMENT;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    queueActivity({ action: "week_created", actor: pilot });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("Telegram critical alerts", () => {
  beforeEach(() => { process.env.MONITORING_ENVIRONMENT = "production"; });
  afterEach(() => { delete process.env.MONITORING_ENVIRONMENT; });

  it("shows failure, status and route, scrubbing private links and addresses", () => {
    const text = formatCritical({ code: "invitation_email_failed for a@b.co", route: `/book/availability/${"x".repeat(48)}?email=a@b.co`, status: 502, eventId: "a".repeat(32) });
    expect(text).toContain("🚨 MyDriveLog failure (PRODUCTION)");
    expect(text).toContain("(502)");
    expect(text).toContain("Route: /book/availability/[token]");
    expect(text).toContain(`Sentry event: ${"a".repeat(32)}`);
    expect(text).not.toContain("a@b.co");
    expect(text).not.toContain("x".repeat(48));
  });
});

describe("monitoring endpoint secrets", () => {
  afterEach(() => { delete process.env.MONITORING_SECRET; delete process.env.SENTRY_WEBHOOK_SECRET; });

  it("rejects missing, short or wrong monitoring secrets", () => {
    const headers = (value?: string) => new Headers(value ? { "x-monitoring-secret": value } : {});
    expect(hasMonitoringSecret(headers("anything"))).toBe(false);
    process.env.MONITORING_SECRET = "short";
    expect(hasMonitoringSecret(headers("short"))).toBe(false);
    process.env.MONITORING_SECRET = "s".repeat(40);
    expect(hasMonitoringSecret(headers())).toBe(false);
    expect(hasMonitoringSecret(headers("t".repeat(40)))).toBe(false);
    expect(hasMonitoringSecret(headers("s".repeat(40)))).toBe(true);
  });

  it("verifies Sentry webhook signatures over the raw body", () => {
    process.env.SENTRY_WEBHOOK_SECRET = "webhook-secret";
    const body = JSON.stringify({ action: "triggered" });
    const signature = createHmac("sha256", "webhook-secret").update(body).digest("hex");
    expect(validSentrySignature(body, signature)).toBe(true);
    expect(validSentrySignature(`${body} `, signature)).toBe(false);
    expect(validSentrySignature(body, null)).toBe(false);
  });
});
