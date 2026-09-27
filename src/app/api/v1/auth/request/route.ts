import type { NextRequest } from "next/server";
import { liveAuthRoutes } from "@/presentation/http/live-auth-routes";
import { queueCritical } from "@/infrastructure/monitoring/telegram";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const response = await liveAuthRoutes().requestCode(request);
  if (response.status >= 500) queueCritical("access_email_failed", "/api/v1/auth/request");
  return response;
}
