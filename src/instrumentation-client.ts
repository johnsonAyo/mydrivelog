import * as Sentry from "@sentry/nextjs";
import { sanitizeBreadcrumb, sanitizeSentryEvent } from "@/infrastructure/monitoring/sentry-privacy";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const environment = process.env.NEXT_PUBLIC_MONITORING_ENVIRONMENT ?? "development";

if (dsn) Sentry.init({
  dsn,
  environment,
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 12),
  tracesSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  replaysSessionSampleRate: 0,
  beforeBreadcrumb: sanitizeBreadcrumb,
  beforeSend(event) {
    const safeEvent = sanitizeSentryEvent(event);
    // Unhandled browser errors alert Telegram immediately. Handled, expected errors are not captured.
    if (safeEvent.event_id && environment !== "development") {
      void fetch("/api/v1/telemetry/frontend-error", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: safeEvent.event_id, path: window.location.pathname }), keepalive: true,
      }).catch(() => undefined);
    }
    return safeEvent;
  },
});
