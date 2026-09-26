import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canWriteWorkspace } from "@/application/auth/can-write-workspace";
import { currentSessionResolver } from "@/infrastructure/auth/current-session-resolver";
import { getDatabase } from "@/infrastructure/database/client";
import { dispatchLessonMessage } from "@/infrastructure/lessons/lesson-delivery";
import { authenticateRequest } from "@/presentation/http/authenticate-request";
import { problem } from "@/presentation/http/problem";

export async function POST(request: NextRequest, { params }: { params: Promise<{ bookingId: string; messageId: string }> }) {
  const auth = await authenticateRequest(request, currentSessionResolver);
  if (!auth.ok) return problem(401, "unauthenticated", "Workspace access is required");
  if (!canWriteWorkspace(auth.session)) return problem(403, "read_only", "This workspace is read-only");
  const { bookingId, messageId } = await params;
  if (!z.uuid().safeParse(bookingId).success || !z.uuid().safeParse(messageId).success) return problem(404, "not_found", "Message not found");
  const { client } = getDatabase();
  const [row] = await client<{ status: string; last_attempt_at: Date | null }[]>`
    select m.status, m.last_attempt_at from lesson_messages m join lesson_debriefs d on d.id = m.debrief_id
    where m.id = ${messageId} and d.workspace_id = ${auth.session.workspaceId}
      and (d.collection_booking_id = ${bookingId} or d.legacy_booking_id = ${bookingId})`;
  if (!row) return problem(404, "not_found", "Message not found");
  if (row.status === "sending" && row.last_attempt_at && Date.now() - row.last_attempt_at.getTime() >= 5 * 60_000) {
    await client`update lesson_messages set status = 'needs_attention' where id = ${messageId} and status = 'sending' and last_attempt_at < now() - interval '5 minutes'`;
  } else if (row.status !== "needs_attention") return problem(409, "not_retryable", "This message is still processing or already delivered");
  const status = await dispatchLessonMessage(auth.session.workspaceId, messageId);
  return NextResponse.json({ data: { id: messageId, status } }, { headers: { "Cache-Control": "private, no-store" } });
}
