import { sendBookingEmail } from "@/infrastructure/booking/booking-email";
import type { ChangeBookingResult } from "@/infrastructure/collections/postgres-collection-repository";

export async function notifyBookingChange(result: Extract<ChangeBookingResult, { ok: true }>) {
  const format = new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: result.timezone });
  const when = `${format.format(new Date(result.startsAt))}–${format.format(new Date(result.endsAt))}`;
  const verb = result.action === "cancel" ? "cancelled" : "rescheduled";
  const [learner, instructor] = await Promise.all([
    sendBookingEmail(result.email, `Your lesson has been ${verb}`, `Hi ${result.name},\n\nYour lesson with ${result.instructorName} has been ${verb}.\n${result.action === "reschedule" ? "New" : "Original"} time: ${when}\n\nPlease contact your instructor if you have questions.`),
    sendBookingEmail(result.instructorEmail, `Lesson ${verb}: ${result.name}`, `${result.name} (${result.email}) has ${verb} a lesson.\n${result.action === "reschedule" ? "New" : "Original"} time: ${when}\n\nYour calendar reflects this change.`),
  ]);
  return { learner, instructor };
}
