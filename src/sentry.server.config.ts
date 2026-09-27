import * as Sentry from "@sentry/nextjs";
import { monitoringEnvironment, monitoringRelease } from "@/infrastructure/monitoring/environment";
import { sanitizeBreadcrumb, sanitizeSentryEvent } from "@/infrastructure/monitoring/sentry-privacy";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) Sentry.init({
  dsn,
  environment: monitoringEnvironment(),
  release: monitoringRelease(),
  tracesSampleRate: 0,
  beforeSend: sanitizeSentryEvent,
  beforeBreadcrumb: sanitizeBreadcrumb,
});
