import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const queueCritical = vi.fn();
vi.mock("@/infrastructure/monitoring/telegram", () => ({ queueCritical }));
const { POST } = await import("./route");

const CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
let ip = 0;
function post(body: object, userAgent = CHROME) {
  ip += 1; // A fresh client each time, so the per-client rate limit never interferes.
  return POST(new NextRequest("https://staging.mydrivelog.co.uk/api/v1/telemetry/frontend-error", {
    method: "POST", body: JSON.stringify(body),
    headers: { "content-type": "application/json", "user-agent": userAgent, "x-real-ip": `10.0.0.${ip}` },
  }));
}
const eventId = "b".repeat(32);

describe("frontend error alert route", () => {
  beforeEach(() => queueCritical.mockClear());

  it("alerts for a real browser error", async () => {
    const response = await post({ eventId, path: "/calendar", message: "TypeError: Cannot read properties of undefined" });
    expect(response.status).toBe(202);
    expect(queueCritical).toHaveBeenCalledWith({ code: "browser_error", route: "/calendar", eventId });
  });

  it("still alerts for an older client that sends no message", async () => {
    await post({ eventId, path: "/" });
    expect(queueCritical).toHaveBeenCalledOnce();
  });

  it("ignores noise named in the message, such as a hydration error", async () => {
    const response = await post({ eventId, path: "/", message: "Error: Minified React error #418; visit https://react.dev/errors/418" });
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ ignored: true });
    expect(queueCritical).not.toHaveBeenCalled();
  });

  it("ignores bots and crawlers", async () => {
    await post({ eventId, path: "/" }, "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)");
    expect(queueCritical).not.toHaveBeenCalled();
  });
});
