import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendBookingConfirmation, sendBookingEmail } from "@/infrastructure/booking/booking-email";
import { changeCollectionBooking, claimCollectionSlot, getPublicCollection, requestGeneralAccess, setCollectionBookingEmailStatus } from "@/infrastructure/collections/postgres-collection-repository";
import { notifyBookingChange } from "@/application/collections/notify-booking-change";
import { problem } from "@/presentation/http/problem";

const tokenPattern = /^[A-Za-z0-9_-]{40,80}$/;
const requestAccessSchema = z.object({ action: z.literal("request_access"), name: z.string().trim().min(2).max(100), email: z.email().max(254) });
const claimSchema = z.object({ action: z.literal("claim"), slotId: z.uuid() });
const changeSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cancel"), collectionId: z.uuid(), bookingId: z.uuid() }),
  z.object({ action: z.literal("reschedule"), collectionId: z.uuid(), bookingId: z.uuid(), slotId: z.uuid() }),
]);

export async function GET(_request: NextRequest, { params }: RouteContext<"/api/public/collections/[token]">) {
  const { token } = await params;
  if (!tokenPattern.test(token)) return problem(404, "not_found", "This availability link is unavailable");
  const collection = await getPublicCollection(token);
  if (!collection) return problem(404, "not_found", "This availability link is unavailable");
  return NextResponse.json({ data: collection }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest, { params }: RouteContext<"/api/public/collections/[token]">) {
  const { token } = await params;
  if (!tokenPattern.test(token)) return problem(404, "not_found", "This availability link is unavailable");
  const body: unknown = await request.json().catch(() => null);
  const change = changeSchema.safeParse(body);
  if (change.success) {
    const result = await changeCollectionBooking({ collectionId: change.data.collectionId, bookingId: change.data.bookingId,
      actor: { kind: "learner", token }, action: change.data.action,
      targetSlotId: change.data.action === "reschedule" ? change.data.slotId : undefined });
    if (!result.ok) return problem(result.reason === "not_found" ? 404 : 409, result.reason,
      result.reason === "too_late" ? "Contact your instructor to change a lesson within 48 hours" : "That lesson or replacement time is no longer available");
    const emailStatus = await notifyBookingChange(result);
    return NextResponse.json({ data: { action: result.action, emailStatus } });
  }
  const access = requestAccessSchema.safeParse(body);
  if (access.success) {
    const result = await requestGeneralAccess(token, access.data.name, access.data.email);
    if (!result) return problem(404, "not_found", "This availability link is unavailable");
    const url = `${process.env.APP_BASE_URL ?? request.nextUrl.origin}/book/availability/${result.accessToken}`;
    const delivery = await sendBookingEmail(access.data.email, "Your driving lesson booking link",
      `Hi ${access.data.name},\n\nUse this personal link to choose and confirm a driving lesson time:\n${url}\n\nIf you did not request this link, you can ignore this email.\n\nMyDriveLog`);
    if (delivery !== "sent") return problem(503, "email_unavailable", "Email verification is not available right now. Ask your instructor for a personal invitation.");
    return NextResponse.json({ data: { emailSent: true } });
  }
  const claim = claimSchema.safeParse(body);
  if (!claim.success) return problem(400, "invalid_request", "Choose an available lesson time");
  const result = await claimCollectionSlot(token, claim.data.slotId);
  if (!result.ok) return problem(result.reason === "unavailable" ? 404 : 409, result.reason,
    result.reason === "weekly_limit" ? "You have reached this instructor’s weekly booking limit" :
      result.reason === "verify_email" ? "Confirm your email before booking" : "That time has just been taken. Choose another available time.");
  const learnerStatus = await sendBookingConfirmation({
    to: result.email, name: result.name, instructor: result.instructorName,
    startsAt: new Date(result.startsAt), endsAt: new Date(result.endsAt), timezone: result.timezone,
    url: `${process.env.APP_BASE_URL ?? request.nextUrl.origin}/book/availability/${token}`,
  });
  const format = new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: result.timezone });
  await sendBookingEmail(result.instructorEmail, `Lesson booked by ${result.name}`,
    `${result.name} (${result.email}) booked a lesson from your availability.\nStart: ${format.format(new Date(result.startsAt))}\nEnd: ${format.format(new Date(result.endsAt))}\n\nOpen your calendar to see the booking.`);
  await setCollectionBookingEmailStatus(result.id, learnerStatus);
  return NextResponse.json({ data: { id: result.id, startsAt: result.startsAt, endsAt: result.endsAt, confirmationEmailStatus: learnerStatus } }, { status: 201 });
}
