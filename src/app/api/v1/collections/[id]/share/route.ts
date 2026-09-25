import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canWriteWorkspace } from "@/application/auth/can-write-workspace";
import { currentSessionResolver } from "@/infrastructure/auth/current-session-resolver";
import { sendBookingInvitation } from "@/infrastructure/booking/booking-email";
import { createGeneralLink, createInvitation, getInstructorForWorkspace, setInvitationEmailStatus } from "@/infrastructure/collections/postgres-collection-repository";
import { authenticateRequest } from "@/presentation/http/authenticate-request";
import { invitationSchema } from "@/presentation/http/collection-validation";
import { problem } from "@/presentation/http/problem";

export async function POST(request: NextRequest, { params }: RouteContext<"/api/v1/collections/[id]/share">) {
  const auth = await authenticateRequest(request, currentSessionResolver);
  if (!auth.ok) return problem(401, "unauthenticated", "Workspace access is required");
  if (!canWriteWorkspace(auth.session)) return problem(403, "read_only", "This workspace is read-only");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return problem(404, "not_found", "Availability draft not found");
  const body: unknown = await request.json().catch(() => null);
  const baseUrl = process.env.APP_BASE_URL ?? request.nextUrl.origin;
  if (z.object({ kind: z.literal("general") }).safeParse(body).success) {
    const result = await createGeneralLink(auth.session.workspaceId, id);
    if (!result.ok) return problem(result.reason === "empty" ? 409 : 404, result.reason, result.reason === "empty" ? "Add a future lesson time before sharing" : "Availability draft not found");
    return NextResponse.json({ data: { url: `${baseUrl}/book/availability/${result.token}` } });
  }
  const parsed = invitationSchema.safeParse(body);
  if (!parsed.success) return problem(400, "invalid_invitation", "Choose an existing learner or enter a name and valid email");
  const result = await createInvitation(auth.session.workspaceId, id, parsed.data.name, parsed.data.email);
  if (!result.ok) return problem(result.reason === "not_found" ? 404 : 409, result.reason,
    result.reason === "empty" ? "Add a future lesson time before sharing" : "Availability draft not found");
  const instructor = await getInstructorForWorkspace(auth.session.workspaceId);
  const url = `${baseUrl}/book/availability/${result.token}`;
  const emailStatus = await sendBookingInvitation({ to: parsed.data.email, name: parsed.data.name, instructor: instructor?.name ?? "Your instructor", url });
  await setInvitationEmailStatus(result.id, emailStatus);
  return NextResponse.json({ data: { id: result.id, url, emailStatus } }, { status: 201 });
}
