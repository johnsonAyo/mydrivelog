import { postgresAuthRepository } from "@/infrastructure/auth/postgres-auth-repository";
import { resendAccessEmailSender } from "@/infrastructure/auth/resend-access-email-sender";
import { firebaseIdentityProvider } from "@/infrastructure/auth/firebase-identity-provider";
import { authRoutes } from "./auth-routes";

export function liveAuthRoutes() {
  const codeSecret = process.env.AUTH_CODE_SECRET;
  if (!codeSecret || codeSecret.length < 32) throw new Error("AUTH_CODE_SECRET must contain at least 32 characters");
  return authRoutes({ auth: postgresAuthRepository, email: resendAccessEmailSender, identity: firebaseIdentityProvider, codeSecret });
}
