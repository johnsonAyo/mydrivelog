import type { NextRequest } from "next/server";
import { liveAuthRoutes } from "@/presentation/http/live-auth-routes";
import { queueCritical } from "@/infrastructure/monitoring/telegram";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const response = await liveAuthRoutes().requestCode(request);
  if (response.status >= 500) queueCritical({ code: "access_email_failed", route: "/api/v1/auth/request", status: response.status });
  return response;
}
