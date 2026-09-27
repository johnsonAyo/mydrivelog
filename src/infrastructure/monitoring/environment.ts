export type MonitoringEnvironment = "development" | "staging" | "production";

export function monitoringEnvironment(): MonitoringEnvironment {
  const configured = process.env.MONITORING_ENVIRONMENT?.trim().toLowerCase();
  if (configured === "production" || configured === "staging" || configured === "development") return configured;
  if (process.env.VERCEL_ENV === "production") return "production";
  return "development";
}

/** Short commit of the running build. Used as the Sentry release and reported by /api/v1/health. */
export function monitoringRelease(): string | undefined {
  return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || undefined;
}
