import type { ErrorEvent } from "@sentry/nextjs";
import { describe, expect, it } from "vitest";
import { browserErrorReport, shouldAlertBrowserError } from "./browser-error-filter";

const CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const APP = "app:///_next/static/chunks/app/page-1a2b3c.js";

function event(type: string, value: string, files: string[] = [APP]): ErrorEvent {
  return { type: undefined, exception: { values: [{ type, value, stacktrace: { frames: files.map((filename) => ({ filename })) } }] } };
}
const alerts = (e: ErrorEvent, userAgent = CHROME) => shouldAlertBrowserError(browserErrorReport(e, userAgent));

describe("browser error filter", () => {
  it("alerts for a real error thrown from our own bundle", () => {
    expect(alerts(event("TypeError", "Cannot read properties of undefined (reading 'start')"))).toBe(true);
    expect(alerts(event("TypeError", "x is not a function", ["https://www.mydrivelog.co.uk/_next/static/chunks/main.js"]))).toBe(true);
    // An extension-free stack that only partly comes from us still counts.
    expect(alerts(event("Error", "Booking state is invalid", ["https://www.googletagmanager.com/gtm.js", APP]))).toBe(true);
  });

  it.each([
    ["Error", "Minified React error #418; visit https://react.dev/errors/418 for the full message"],
    ["Error", "Minified React error #423; visit https://react.dev/errors/423"],
    ["Error", "Minified React error #425; visit https://react.dev/errors/425"],
    ["Error", "Hydration failed because the server rendered HTML didn't match the client."],
    ["Error", "There was an error while hydrating. Because the error happened outside of a Suspense boundary"],
    ["Error", "A tree hydrated but some attributes of the server rendered HTML didn't match the client properties."],
    ["Error", "Text content does not match server-rendered HTML."],
  ])("skips React hydration errors: %s %s", (type, value) => {
    expect(alerts(event(type, value))).toBe(false);
  });

  it.each([
    ["ChunkLoadError", "Loading chunk 123 failed."],
    ["Error", "Loading chunk app/page failed."],
    ["Error", "Loading CSS chunk 7 failed."],
    ["TypeError", "Failed to fetch dynamically imported module: https://www.mydrivelog.co.uk/_next/static/chunks/a.js"],
  ])("skips stale or blocked chunks: %s %s", (type, value) => {
    expect(alerts(event(type, value))).toBe(false);
  });

  it("skips ResizeObserver loop warnings", () => {
    expect(alerts(event("Error", "ResizeObserver loop completed with undelivered notifications."))).toBe(false);
    expect(alerts(event("Error", "ResizeObserver loop limit exceeded"))).toBe(false);
  });

  it.each([
    ["AbortError", "signal is aborted without reason"],
    ["TypeError", "Failed to fetch"],
    ["TypeError", "NetworkError when attempting to fetch resource."],
    ["TypeError", "Load failed"],
    ["Error", "The operation was aborted."],
  ])("skips dropped network requests: %s %s", (type, value) => {
    expect(alerts(event(type, value))).toBe(false);
  });

  it.each(["chrome-extension://abc/content.js", "moz-extension://abc/inject.js", "safari-extension://abc/x.js", "safari-web-extension://abc/x.js"])(
    "skips errors with frames from a browser extension: %s", (file) => {
      expect(alerts(event("TypeError", "Cannot read properties of null", [file, APP]))).toBe(false);
    });

  it("skips errors with no frame from our own bundle", () => {
    expect(alerts(event("TypeError", "undefined is not an object", ["https://cdn.example.com/widget.js"]))).toBe(false);
    expect(alerts(event("Error", "Script error.", []))).toBe(false);
  });

  it.each([
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
    "Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/141.0.0.0 Safari/537.36",
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    "curl/8.7.1",
  ])("skips bots and crawlers: %s", (userAgent) => {
    expect(alerts(event("TypeError", "Cannot read properties of undefined"), userAgent)).toBe(false);
  });

  it("checks only what a direct post carries: message and user agent, no frames", () => {
    expect(shouldAlertBrowserError({ userAgent: CHROME })).toBe(true);
    expect(shouldAlertBrowserError({ message: "TypeError: x is undefined", userAgent: CHROME })).toBe(true);
    expect(shouldAlertBrowserError({ message: "Error: Minified React error #418", userAgent: CHROME })).toBe(false);
    expect(shouldAlertBrowserError({ userAgent: "Googlebot/2.1" })).toBe(false);
  });
});
