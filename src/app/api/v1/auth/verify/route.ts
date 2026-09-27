import type { NextRequest } from "next/server";
import { liveAuthRoutes } from "@/presentation/http/live-auth-routes";
import { queueCritical } from "@/infrastructure/monitoring/telegram";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const response = await liveAuthRoutes().verifyCode(request);
  if (response.status >= 500) queueCritical("access_verification_failed", "/api/v1/auth/verify");
  return response;
}
