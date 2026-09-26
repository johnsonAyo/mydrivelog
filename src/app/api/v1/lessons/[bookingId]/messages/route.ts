import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canWriteWorkspace } from "@/application/auth/can-write-workspace";
import { currentSessionResolver } from "@/infrastructure/auth/current-session-resolver";
import { dispatchLessonMessage } from "@/infrastructure/lessons/lesson-delivery";
import { queueLessonMessage } from "@/infrastructure/lessons/lesson-operations";
import { authenticateRequest } from "@/presentation/http/authenticate-request";
import { problem } from "@/presentation/http/problem";

export async function POST(request: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const auth = await authenticateRequest(request, currentSessionResolver);
  if (!auth.ok) return problem(401, "unauthenticated", "Workspace access is required");
  if (!canWriteWorkspace(auth.session)) return problem(403, "read_only", "This workspace is read-only");
  const { bookingId } = await params;
  if (!z.uuid().safeParse(bookingId).success) return problem(404, "not_found", "Lesson not found");
  const parsed = z.object({ kind: z.enum(["recap", "follow_up"]), idempotencyKey: z.uuid(),
    previewHash: z.string().regex(/^[a-f0-9]{64}$/), expectedRevision: z.number().int().min(0),
    correction: z.string().max(5000).optional() }).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return problem(400, "invalid_request", "Review the message again before sending");
  const result = await queueLessonMessage(auth.session.workspaceId, bookingId, parsed.data);
  if (!result.ok) return problem(result.reason === "not_found" ? 404 : 409, result.reason, "The message changed or cannot be sent yet. Review it again");
  await dispatchLessonMessage(auth.session.workspaceId, result.value.id);
  return NextResponse.json({ data: { id: result.value.id } }, { headers: { "Cache-Control": "private, no-store" } });
}
