import { sendBookingEmail } from "@/infrastructure/booking/booking-email";
import { getDatabase } from "@/infrastructure/database/client";

export async function dispatchLessonMessage(workspaceId: string, messageId: string) {
  const { client } = getDatabase();
  const [message] = await client<{ id: string; recipient_email: string; subject: string; body: string; status: string }[]>`
    update lesson_messages m set status = 'sending', attempts = attempts + 1, last_attempt_at = now()
    from lesson_debriefs d where m.id = ${messageId} and m.debrief_id = d.id and d.workspace_id = ${workspaceId}
      and m.status in ('queued', 'needs_attention')
    returning m.id, m.recipient_email, m.subject, m.body, m.status`;
  if (!message) return null;
  const result = await sendBookingEmail(message.recipient_email, message.subject, message.body, message.id);
  const [updated] = await client<{ status: string }[]>`
    update lesson_messages set status = ${result === "sent" ? "delivered" : "needs_attention"},
      delivered_at = ${result === "sent" ? new Date() : null}
    where id = ${messageId} and status = 'sending' returning status`;
  return updated?.status ?? "needs_attention";
}
