import * as Sentry from "@sentry/nextjs";
import { monitoringEnvironment } from "@/infrastructure/monitoring/environment";
import { sanitizeBreadcrumb, sanitizeSentryEvent } from "@/infrastructure/monitoring/sentry-privacy";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: monitoringEnvironment(),
  tracesSampleRate: 0,
  beforeSend: sanitizeSentryEvent,
  beforeBreadcrumb: sanitizeBreadcrumb,
});
