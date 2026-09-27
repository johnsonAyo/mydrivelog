import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { postgresAuthRepository } from "@/infrastructure/auth/postgres-auth-repository";
import { postgresSessionResolver } from "@/infrastructure/auth/postgres-session-resolver";
import { queueActivity } from "@/infrastructure/monitoring/telegram";
import { problem } from "@/presentation/http/problem";

// The workspace name is shown to pupils exactly as typed, so it is kept whole (only trimmed).
const inputSchema = z.object({ workspaceName: z.string().trim().min(1).max(100) });

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") && request.headers.get("origin") !== request.nextUrl.origin) return problem(403, "invalid_origin", "This request is not allowed");
  const token = request.cookies.get(process.env.SESSION_COOKIE_NAME ?? "drivetrack_session")?.value;
  const session = await postgresSessionResolver.resolve(token ?? null);
  if (!session) return problem(401, "unauthenticated", "Sign in to continue");
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return problem(400, "invalid_workspace_name", "Enter a workspace name of up to 100 characters");
  const { workspaceName } = parsed.data;
  const created = await postgresAuthRepository.completeOnboarding({ identityId: session.identityId, workspaceName });
  if (created) queueActivity({ action: "instructor_signed_up", reference: session.workspaceId,
    actor: { ...session, instructorName: workspaceName } });
  return NextResponse.json({ next: "/calendar" }, { headers: { "Cache-Control": "private, no-store" } });
}
