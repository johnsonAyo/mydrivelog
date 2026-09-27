import * as Sentry from "@sentry/nextjs";
import { sanitizeBreadcrumb, sanitizeSentryEvent } from "@/infrastructure/monitoring/sentry-privacy";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) Sentry.init({
  dsn,
  environment: process.env.NEXT_PUBLIC_MONITORING_ENVIRONMENT ?? "development",
  tracesSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  replaysSessionSampleRate: 0,
  beforeBreadcrumb: sanitizeBreadcrumb,
  beforeSend(event) {
    const safeEvent = sanitizeSentryEvent(event);
    if (safeEvent.event_id) {
      void fetch("/api/v1/telemetry/frontend-error", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: safeEvent.event_id }), keepalive: true,
      }).catch(() => undefined);
    }
    return safeEvent;
  },
});
