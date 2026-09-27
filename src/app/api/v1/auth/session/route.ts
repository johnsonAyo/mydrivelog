import type { NextRequest } from "next/server";
import { liveAuthRoutes } from "@/presentation/http/live-auth-routes";
import { postgresSessionResolver } from "@/infrastructure/auth/postgres-session-resolver";
import { queueActivity, queueCritical } from "@/infrastructure/monitoring/telegram";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const response = await liveAuthRoutes().establishSession(request);
  if (response.status === 200) {
    try {
      const token = response.cookies.get(process.env.SESSION_COOKIE_NAME ?? "drivetrack_session")?.value;
      const actor = await postgresSessionResolver.resolve(token ?? null);
      if (actor) queueActivity({ action: "instructor_logged_in", reference: actor.workspaceId, actor });
    } catch {
      queueCritical("login_activity_lookup_failed", "/api/v1/auth/session");
    }
  } else if (response.status >= 500) queueCritical("session_creation_failed", "/api/v1/auth/session");
  return response;
}
