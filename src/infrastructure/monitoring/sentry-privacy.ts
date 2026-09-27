import type { ErrorEvent, Breadcrumb } from "@sentry/nextjs";

const PRIVATE_PATH = /\/(?:book|availability|collections)\/[^/?#\s]+/gi;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const LINK_TOKEN = /\b[A-Za-z0-9_-]{40,}\b/g;

export function scrubMonitoringText(value: string): string {
  return value.replace(EMAIL, "[email]").replace(LINK_TOKEN, "[token]")
    .replace(PRIVATE_PATH, "/[private-link]").slice(0, 500);
}

export function safeMonitoringPath(value: string): string {
  try {
    const url = new URL(value, "https://mydrivelog.invalid");
    return url.pathname.replace(PRIVATE_PATH, "/[private-link]");
  } catch {
    return "[redacted]";
  }
}

export function sanitizeSentryEvent(event: ErrorEvent): ErrorEvent {
  delete event.user;
  if (event.request) {
    event.request = { url: event.request.url ? safeMonitoringPath(event.request.url) : undefined, method: event.request.method };
  }
  if (event.breadcrumbs) event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => ({
    category: breadcrumb.category,
    level: breadcrumb.level,
    message: breadcrumb.message ? scrubMonitoringText(breadcrumb.message) : undefined,
  }));
  // Automatic spans can contain public invitation tokens, email addresses and
  // lesson content. Errors and stack traces remain useful without those spans.
  delete event.spans;
  delete event.contexts;
  delete event.extra;
  delete event.fingerprint;
  delete event.sdkProcessingMetadata;
  if (event.tags) event.tags = Object.fromEntries(Object.entries(event.tags)
    .filter(([key]) => /^[a-z0-9_.-]{1,40}$/i.test(key))
    .map(([key, value]) => [key, scrubMonitoringText(String(value))]));
  if (event.message) event.message = scrubMonitoringText(event.message);
  if (event.transaction) event.transaction = safeMonitoringPath(event.transaction);
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = scrubMonitoringText(exception.value);
    for (const frame of exception.stacktrace?.frames ?? []) {
      if (frame.filename) frame.filename = scrubMonitoringText(frame.filename);
      if (frame.abs_path) frame.abs_path = safeMonitoringPath(frame.abs_path);
      delete frame.vars;
      delete frame.context_line;
      delete frame.pre_context;
      delete frame.post_context;
    }
  }
  return event;
}

export function sanitizeBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  if (breadcrumb.category === "ui.click" || breadcrumb.category === "console") return null;
  return { category: breadcrumb.category, level: breadcrumb.level,
    message: breadcrumb.message ? scrubMonitoringText(breadcrumb.message) : undefined };
}
