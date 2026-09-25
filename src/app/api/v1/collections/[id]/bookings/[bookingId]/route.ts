import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canWriteWorkspace } from "@/application/auth/can-write-workspace";
import { notifyBookingChange } from "@/application/collections/notify-booking-change";
import { currentSessionResolver } from "@/infrastructure/auth/current-session-resolver";
import { changeCollectionBooking } from "@/infrastructure/collections/postgres-collection-repository";
import { authenticateRequest } from "@/presentation/http/authenticate-request";
import { problem } from "@/presentation/http/problem";

const changeSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cancel") }),
  z.object({ action: z.literal("reschedule"), slotId: z.uuid() }),
]);

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; bookingId: string }> }) {
  const auth = await authenticateRequest(request, currentSessionResolver);
  if (!auth.ok) return problem(401, "unauthenticated", "Workspace access is required");
  if (!canWriteWorkspace(auth.session)) return problem(403, "read_only", "This workspace is read-only");
  const parsed = changeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return problem(400, "invalid_change", "Choose a valid lesson change");
  const { id, bookingId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(bookingId).success) return problem(404, "not_found", "Lesson not found");
  const result = await changeCollectionBooking({ collectionId: id, bookingId, actor: { kind: "instructor", workspaceId: auth.session.workspaceId }, action: parsed.data.action, targetSlotId: parsed.data.action === "reschedule" ? parsed.data.slotId : undefined });
  if (!result.ok) return problem(result.reason === "not_found" ? 404 : 409, result.reason, "This booking or replacement time is no longer available");
  const emailStatus = await notifyBookingChange(result);
  return NextResponse.json({ data: { action: result.action, emailStatus } });
}
