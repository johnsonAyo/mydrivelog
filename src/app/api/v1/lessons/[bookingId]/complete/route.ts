import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canWriteWorkspace } from "@/application/auth/can-write-workspace";
import { currentSessionResolver } from "@/infrastructure/auth/current-session-resolver";
import { completeInstructorLesson } from "@/infrastructure/lessons/lesson-operations";
import { authenticateRequest } from "@/presentation/http/authenticate-request";
import { problem } from "@/presentation/http/problem";

export async function POST(request: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const auth = await authenticateRequest(request, currentSessionResolver);
  if (!auth.ok) return problem(401, "unauthenticated", "Workspace access is required");
  if (!canWriteWorkspace(auth.session)) return problem(403, "read_only", "This workspace is read-only");
  const { bookingId } = await params;
  if (!z.uuid().safeParse(bookingId).success) return problem(404, "not_found", "Lesson not found");
  const parsed = z.object({ acknowledgeEmpty: z.boolean() }).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return problem(400, "invalid_request", "Check the completion request");
  const result = await completeInstructorLesson(auth.session.workspaceId, bookingId, parsed.data.acknowledgeEmpty);
  if (!result.ok) return problem(result.reason === "not_found" ? 404 : 409, result.reason,
    result.reason === "too_early" ? "The lesson has not ended yet" : result.reason === "empty" ? "Acknowledge completing without notes" : "Lesson not found");
  return NextResponse.json({ data: { completed: true } }, { headers: { "Cache-Control": "private, no-store" } });
}
