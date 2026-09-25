import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canWriteWorkspace } from "@/application/auth/can-write-workspace";
import { currentSessionResolver } from "@/infrastructure/auth/current-session-resolver";
import { sendBookingInvitation } from "@/infrastructure/booking/booking-email";
import { getWindowDetail, releaseWindow, setRecipientEmailStatus } from "@/infrastructure/booking/postgres-booking-repository";
import { authenticateRequest } from "@/presentation/http/authenticate-request";
import { problem } from "@/presentation/http/problem";

const releaseSchema = z.object({
  recipients: z.array(z.object({ name: z.string().trim().min(1).max(100), email: z.email() })).min(1).max(30),
  sendEmail: z.boolean().default(true),
});

export async function POST(request: NextRequest, { params }: RouteContext<"/api/v1/availability/[id]/release">) {
  const auth = await authenticateRequest(request, currentSessionResolver);
  if (!auth.ok) return problem(401, "unauthenticated", "Workspace access is required");
  if (!canWriteWorkspace(auth.session)) return problem(403, "read_only", "This workspace is read-only");
  const parsed = releaseSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return problem(400, "invalid_recipients", "Add at least one recipient with a name and valid email");
  const { id } = await params;
  const detail = await getWindowDetail(auth.session.workspaceId, id);
  if (!detail || detail.status !== "open") return problem(404, "not_found", "Availability not found");
  const uniqueEmails = new Set(parsed.data.recipients.map((recipient) => recipient.email.toLowerCase()));
  if (uniqueEmails.size !== parsed.data.recipients.length) return problem(400, "duplicate_recipient", "Each recipient should appear only once");
  const released = await releaseWindow(auth.session.workspaceId, id, parsed.data.recipients);
  if (!released) return problem(409, "unavailable", "This availability window cannot be shared now");
  const origin = process.env.APP_BASE_URL ?? request.nextUrl.origin;
  const links = await Promise.all(released.links.map(async (recipient) => {
    const url = `${origin}/book/${recipient.token}`;
    const emailStatus = parsed.data.sendEmail
      ? await sendBookingInvitation({ to: recipient.email, name: recipient.name, instructor: detail.instructorName, url })
      : "not_sent" as const;
    if (emailStatus !== "not_sent") await setRecipientEmailStatus(recipient.id, emailStatus);
    return { name: recipient.name, email: recipient.email, url, emailStatus };
  }));
  return NextResponse.json({ data: { id: released.releaseId, expiresAt: released.expiresAt, links } },
    { status: 201, headers: { "Cache-Control": "private, no-store" } });
}
