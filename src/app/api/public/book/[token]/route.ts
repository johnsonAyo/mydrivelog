import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendBookingConfirmation } from "@/infrastructure/booking/booking-email";
import { claimBooking, getPublicBooking, setBookingEmailStatus } from "@/infrastructure/booking/postgres-booking-repository";
import { problem } from "@/presentation/http/problem";

const claimSchema = z.object({ startsAt: z.iso.datetime({ offset: true }) });

export async function GET(_request: NextRequest, { params }: RouteContext<"/api/public/book/[token]">) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{40,80}$/.test(token)) return problem(404, "not_found", "This booking link is unavailable");
  const booking = await getPublicBooking(token);
  if (!booking) return problem(404, "not_found", "This booking link is unavailable or has expired");
  return NextResponse.json({ data: booking }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest, { params }: RouteContext<"/api/public/book/[token]">) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{40,80}$/.test(token)) return problem(404, "not_found", "This booking link is unavailable");
  const parsed = claimSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return problem(400, "invalid_time", "Choose one of the offered lesson times");
  const claimed = await claimBooking(token, new Date(parsed.data.startsAt));
  if (!claimed.ok) {
    const detail = claimed.reason === "conflict" ? "That time was just taken. Choose another available time." :
      claimed.reason === "weekly_limit" ? "You have reached your instructor’s weekly booking limit." :
        claimed.reason === "already_booked" ? "You have already booked from this invitation." : "This booking link is unavailable.";
    return problem(claimed.reason === "unavailable" ? 404 : 409, claimed.reason, detail);
  }
  const publicView = await getPublicBooking(token);
  const emailStatus = await sendBookingConfirmation({
    to: claimed.email, name: claimed.name, instructor: claimed.instructorName,
    startsAt: new Date(claimed.startsAt), endsAt: new Date(claimed.endsAt),
    timezone: publicView?.timezone ?? "Europe/London", url: `${process.env.APP_BASE_URL ?? request.nextUrl.origin}/book/${token}`,
  });
  await setBookingEmailStatus(claimed.id, emailStatus);
  return NextResponse.json({ data: { id: claimed.id, startsAt: claimed.startsAt, endsAt: claimed.endsAt, confirmationEmailStatus: emailStatus } },
    { status: 201, headers: { "Cache-Control": "private, no-store" } });
}
