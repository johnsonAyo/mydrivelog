import { postgresAuthRepository } from "@/infrastructure/auth/postgres-auth-repository";
import { resendAccessEmailSender } from "@/infrastructure/auth/resend-access-email-sender";
import { authRoutes } from "./auth-routes";

export function liveAuthRoutes() {
  const origin = process.env.APP_BASE_URL;
  if (!origin) throw new Error("APP_BASE_URL is not configured");
  return authRoutes({ auth: postgresAuthRepository, email: resendAccessEmailSender, origin });
}
