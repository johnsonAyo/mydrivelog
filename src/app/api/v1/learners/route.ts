import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canWriteWorkspace } from "@/application/auth/can-write-workspace";
import { currentSessionResolver } from "@/infrastructure/auth/current-session-resolver";
import { listLearners, saveLearner } from "@/infrastructure/learners/postgres-learner-repository";
import { authenticateRequest } from "@/presentation/http/authenticate-request";
import { problem } from "@/presentation/http/problem";

const learnerSchema = z.object({
  sourceEmail: z.email().max(254),
  name: z.string().trim().min(2).max(100),
  email: z.email().max(254),
});

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, currentSessionResolver);
  if (!auth.ok) return problem(401, "unauthenticated", "Workspace access is required");
  return NextResponse.json({ data: await listLearners(auth.session.workspaceId) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, currentSessionResolver);
  if (!auth.ok) return problem(401, "unauthenticated", "Workspace access is required");
  if (!canWriteWorkspace(auth.session)) return problem(403, "read_only", "This workspace is read-only");
  const parsed = learnerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return problem(400, "invalid_learner", "Add a valid name and email address");
  const id = await saveLearner(auth.session.workspaceId, parsed.data);
  return NextResponse.json({ data: { id } }, { status: 201 });
}
