import type { ErrorEvent } from "@sentry/nextjs";

/** What we know about a browser error. The browser knows everything; a direct post may only carry some of it. */
export type BrowserErrorReport = {
  /** Exception types and messages, e.g. "ChunkLoadError: Loading chunk 12 failed". */
  message?: string;
  /** Stack frame file names. Undefined when unknown, which skips the frame checks. */
  frames?: string[];
  userAgent?: string | null;
};

// Errors that are not bugs in our code: hydration mismatches (usually extensions or auto-translate
// editing the page), stale or blocked chunks, ResizeObserver warnings, and dropped network requests.
const NOISE = [
  /Minified React error #(418|423|425)\b/i,
  /react\.dev\/errors\/(418|423|425)\b/i,
  /hydrat/i, // "Hydration failed", "There was an error while hydrating", hydration mismatch text
  /Text content does not match/i,
  /ChunkLoadError/i,
  /Loading (CSS )?chunk/i,
  /Failed to fetch dynamically imported module/i,
  /ResizeObserver loop/i,
  /AbortError/i,
  /Failed to fetch/i,
  /NetworkError/i,
  /\bLoad failed\b/i,
  /The operation was aborted/i,
];

const EXTENSION_FRAME = /^(chrome|moz|safari|safari-web)-extension:\/\//i;
// Our own bundle: Sentry rewrites it to app:///_next/..., otherwise it is <origin>/_next/... or /_next/...
const APP_FRAME = /^(app:\/\/\/_next\/|https?:\/\/[^/]+\/_next\/|\/_next\/)/i;
const BOT = /bot\b|crawler|spider|slurp|headlesschrome|lighthouse|facebookexternalhit|python-requests|curl\/|wget\//i;

/** True only for a browser error worth an instant Telegram alert. */
export function shouldAlertBrowserError({ message, frames, userAgent }: BrowserErrorReport): boolean {
  if (userAgent && BOT.test(userAgent)) return false;
  if (message && NOISE.some((pattern) => pattern.test(message))) return false;
  if (frames) {
    if (frames.some((file) => EXTENSION_FRAME.test(file))) return false;
    if (!frames.some((file) => APP_FRAME.test(file))) return false;
  }
  return true;
}

/** Builds the report from a Sentry browser event. Frames are only checked when the event is an exception. */
export function browserErrorReport(event: ErrorEvent, userAgent?: string): BrowserErrorReport {
  const exceptions = event.exception?.values ?? [];
  const message = [event.message, ...exceptions.map((e) => [e.type, e.value].filter(Boolean).join(": "))].filter(Boolean).join("\n");
  const frames = exceptions.length ? exceptions.flatMap((e) => e.stacktrace?.frames ?? []).map((f) => f.filename ?? f.abs_path ?? "") : undefined;
  return { message, frames, userAgent };
}
