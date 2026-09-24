import type { NextRequest } from "next/server";
import type { SessionContext, SessionResolver } from "@/application/auth/session-context";

export type AuthenticationResult =
  | { readonly ok: true; readonly session: SessionContext }
  | { readonly ok: false; readonly reason: "unauthenticated" | "suspended" };

export async function authenticateRequest(
  request: NextRequest,
  resolver: SessionResolver,
): Promise<AuthenticationResult> {
  const cookieName = process.env.SESSION_COOKIE_NAME ?? "drivetrack_session";
  const rawToken = request.cookies.get(cookieName)?.value ?? null;
  const session = await resolver.resolve(rawToken);
  if (!session) {
    return { ok: false, reason: "unauthenticated" };
  }

  if (session.workspaceStatus === "suspended") {
    return { ok: false, reason: "suspended" };
  }

  return { ok: true, session };
}
