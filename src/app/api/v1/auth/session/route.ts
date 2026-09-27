import type { NextRequest } from "next/server";
import { liveAuthRoutes } from "@/presentation/http/live-auth-routes";
import { postgresSessionResolver } from "@/infrastructure/auth/postgres-session-resolver";
import { queueActivity, queueCritical } from "@/infrastructure/monitoring/telegram";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const response = await liveAuthRoutes().establishSession(request);
  if (response.status === 200) {
    const token = response.cookies.get(process.env.SESSION_COOKIE_NAME ?? "drivetrack_session")?.value ?? null;
    const body = response.clone();
    queueActivity({ action: "instructor_logged_in", resolve: async () => {
      const [actor, next] = await Promise.all([postgresSessionResolver.resolve(token),
        body.json().then((data: { next?: string }) => data.next).catch(() => undefined)]);
      // A first sign-in goes to onboarding; the signup message follows when onboarding is finished.
      return { actor: actor ?? undefined, reference: actor?.workspaceId,
        action: next === "/onboarding" ? "instructor_signed_in_onboarding" : "instructor_logged_in" };
    } });
  } else if (response.status >= 500) queueCritical({ code: "session_creation_failed", route: "/api/v1/auth/session", status: response.status });
  return response;
}
