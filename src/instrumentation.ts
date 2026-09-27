import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./sentry.server.config");
}

// Every unhandled server error (a crash or thrown 5xx) goes to Sentry and to Telegram straight away.
export const onRequestError = async (...args: Parameters<typeof Sentry.captureRequestError>) => {
  Sentry.captureRequestError(...args);
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const [, request] = args;
  const { sendCritical, monitoringEnabled } = await import("@/infrastructure/monitoring/telegram");
  if (!monitoringEnabled()) return;
  const { safeMonitoringPath } = await import("@/infrastructure/monitoring/sentry-privacy");
  try {
    await sendCritical({ code: "unhandled_server_error", route: safeMonitoringPath(request.path), status: 500,
      eventId: Sentry.getClient() ? Sentry.lastEventId() : undefined });
  } catch (error) {
    Sentry.captureException(error, { tags: { source: "telegram-critical" } });
  }
  await Sentry.flush(2_000).catch(() => false);
};
