import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canWriteWorkspace } from "@/application/auth/can-write-workspace";
import { currentSessionResolver } from "@/infrastructure/auth/current-session-resolver";
import { saveSlot } from "@/infrastructure/collections/postgres-collection-repository";
import { authenticateRequest } from "@/presentation/http/authenticate-request";
import { exactSlotSchema } from "@/presentation/http/collection-validation";
import { problem } from "@/presentation/http/problem";

export async function POST(request: NextRequest, { params }: RouteContext<"/api/v1/collections/[id]/slots">) {
  const auth = await authenticateRequest(request, currentSessionResolver);
  if (!auth.ok) return problem(401, "unauthenticated", "Workspace access is required");
  if (!canWriteWorkspace(auth.session)) return problem(403, "read_only", "This workspace is read-only");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return problem(404, "not_found", "Availability draft not found");
  const parsed = exactSlotSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || new Date(parsed.data.startsAt) <= new Date()) return problem(400, "invalid_slot", "Choose a future start and end, between 15 minutes and 8 hours apart");
  const result = await saveSlot(auth.session.workspaceId, id, { startsAt: new Date(parsed.data.startsAt), endsAt: new Date(parsed.data.endsAt), makeAvailable: parsed.data.makeAvailable });
  if (!result.ok) return problem(result.reason === "not_found" ? 404 : 409, result.reason, result.reason === "overlap" ? "This lesson overlaps another time in the collection" : result.reason === "outside_week" ? "Choose a lesson time inside this week" : "Availability draft not found");
  return NextResponse.json({ data: result.slot, warning: result.warning }, { status: 201 });
}
