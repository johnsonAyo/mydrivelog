export type MonitoringEnvironment = "development" | "staging" | "production";

export function monitoringEnvironment(): MonitoringEnvironment {
  const configured = process.env.MONITORING_ENVIRONMENT?.trim().toLowerCase();
  if (configured === "production" || configured === "staging" || configured === "development") return configured;
  if (process.env.VERCEL_ENV === "production") return "production";
  return "development";
}
