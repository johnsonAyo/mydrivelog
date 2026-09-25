import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canWriteWorkspace } from "@/application/auth/can-write-workspace";
import { currentSessionResolver } from "@/infrastructure/auth/current-session-resolver";
import { saveSlot, setSlotStatus } from "@/infrastructure/collections/postgres-collection-repository";
import { authenticateRequest } from "@/presentation/http/authenticate-request";
import { exactSlotSchema } from "@/presentation/http/collection-validation";
import { problem } from "@/presentation/http/problem";

const statusSchema = z.object({ status: z.enum(["private", "open", "closed"]) });

export async function PATCH(request: NextRequest, { params }: RouteContext<"/api/v1/collections/[id]/slots/[slotId]">) {
  const auth = await authenticateRequest(request, currentSessionResolver);
  if (!auth.ok) return problem(401, "unauthenticated", "Workspace access is required");
  if (!canWriteWorkspace(auth.session)) return problem(403, "read_only", "This workspace is read-only");
  const { id, slotId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(slotId).success) return problem(404, "not_found", "Lesson time not found");
  const body: unknown = await request.json().catch(() => null);
  const status = statusSchema.safeParse(body);
  if (status.success) {
    if (!await setSlotStatus(auth.session.workspaceId, id, slotId, status.data.status)) return problem(409, "not_editable", "Booked times cannot be changed here");
    return NextResponse.json({ data: { id: slotId, status: status.data.status } });
  }
  const parsed = exactSlotSchema.safeParse(body);
  if (!parsed.success || new Date(parsed.data.startsAt) <= new Date()) return problem(400, "invalid_slot", "Choose a future start and end, between 15 minutes and 8 hours apart");
  const result = await saveSlot(auth.session.workspaceId, id, { id: slotId, startsAt: new Date(parsed.data.startsAt), endsAt: new Date(parsed.data.endsAt), makeAvailable: parsed.data.makeAvailable });
  if (!result.ok) return problem(result.reason === "not_found" ? 404 : 409, result.reason,
    result.reason === "booked" ? "A booked lesson needs a separate reschedule or cancellation" : result.reason === "overlap" ? "This lesson overlaps another time in the collection" : result.reason === "outside_week" ? "Choose a lesson time inside this week" : "Lesson time not found");
  return NextResponse.json({ data: result.slot, warning: result.warning });
}
