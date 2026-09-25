import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canWriteWorkspace } from "@/application/auth/can-write-workspace";
import { currentSessionResolver } from "@/infrastructure/auth/current-session-resolver";
import { editWindow, getWindowDetail } from "@/infrastructure/booking/postgres-booking-repository";
import { authenticateRequest } from "@/presentation/http/authenticate-request";
import { problem } from "@/presentation/http/problem";

const editSchema = z.object({
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }),
  sessionMinutes: z.number().int().min(15).max(480),
  bufferMinutes: z.number().int().min(0).max(120),
  revokePublished: z.boolean().default(false),
});

export async function GET(request: NextRequest, { params }: RouteContext<"/api/v1/availability/[id]">) {
  const auth = await authenticateRequest(request, currentSessionResolver);
  if (!auth.ok) return problem(401, "unauthenticated", "Workspace access is required");
  const { id } = await params;
  const window = await getWindowDetail(auth.session.workspaceId, id);
  if (!window) return problem(404, "not_found", "Availability not found");
  return NextResponse.json({ data: window }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: NextRequest, { params }: RouteContext<"/api/v1/availability/[id]">) {
  const auth = await authenticateRequest(request, currentSessionResolver);
  if (!auth.ok) return problem(401, "unauthenticated", "Workspace access is required");
  if (!canWriteWorkspace(auth.session)) return problem(403, "read_only", "This workspace is read-only");
  const parsed = editSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || new Date(parsed.data.endsAt).getTime() - new Date(parsed.data.startsAt).getTime() < parsed.data.sessionMinutes * 60_000) {
    return problem(400, "invalid_window", "The window must fit at least one complete lesson");
  }
  const { id } = await params;
  try {
    const result = await editWindow(auth.session.workspaceId, id, {
      startsAt: new Date(parsed.data.startsAt), endsAt: new Date(parsed.data.endsAt),
      sessionMinutes: parsed.data.sessionMinutes, bufferMinutes: parsed.data.bufferMinutes,
      revokePublished: parsed.data.revokePublished,
    });
    if (!result.ok) return problem(result.reason === "not_found" ? 404 : 409, result.reason,
      result.reason === "has_bookings" ? "Booked availability cannot be moved" :
        result.reason === "release_exists" ? "Editing this window will revoke its shared links. Confirm that action first." :
          result.reason === "overlap" ? "This window overlaps another availability window" : "Availability not found");
    return NextResponse.json({ data: await getWindowDetail(auth.session.workspaceId, id), revokedLinks: result.revokedLinks });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "23P01") return problem(409, "overlap", "This window overlaps another availability window");
    throw error;
  }
}
