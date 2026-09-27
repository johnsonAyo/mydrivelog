import * as Sentry from "@sentry/nextjs";
import { sendCritical } from "@/infrastructure/monitoring/telegram";
import { safeMonitoringPath } from "@/infrastructure/monitoring/sentry-privacy";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./sentry.server.config");
}

export const onRequestError = async (...args: Parameters<typeof Sentry.captureRequestError>) => {
  Sentry.captureRequestError(...args);
  const [, request] = args;
  try {
    await sendCritical("unhandled_server_error", safeMonitoringPath(request.path));
  } catch (error) {
    Sentry.captureException(error, { tags: { source: "telegram-critical" } });
  }
};
