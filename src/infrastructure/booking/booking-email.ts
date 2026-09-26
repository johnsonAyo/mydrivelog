type EmailResult = "sent" | "failed" | "not_configured";

function parseSender(from: string): { name: string; email: string } {
  const match = from.match(/^(?:(.*)<)?([^>]+)>?$/);
  if (match && match[1]) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: "MyDriveLog", email: from.trim() };
}

export async function sendBookingEmail(to: string, subject: string, body: string, idempotencyKey?: string): Promise<EmailResult> {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const from = process.env.ACCESS_EMAIL_FROM;
  if ((!brevoApiKey && !resendApiKey) || !from) return "not_configured";

  try {
    if (brevoApiKey) {
      const sender = parseSender(from);
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": brevoApiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          sender,
          to: [{ email: to }],
          subject,
          textContent: body,
        }),
      });
      return response.ok ? "sent" : "failed";
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) },
      body: JSON.stringify({ from, to: [to], subject, text: body }),
    });
    return response.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}

export function sendBookingInvitation(input: { to: string; name: string; instructor: string; url: string }) {
  return sendBookingEmail(input.to, `${input.instructor} has lesson times for you`,
    `Hi ${input.name},\n\n${input.instructor} has shared available driving lesson times. Choose a time here:\n${input.url}\n\nThis link is only for you. If you were not expecting it, you can ignore this email.`);
}

export function sendBookingConfirmation(input: { to: string; name: string; instructor: string; startsAt: Date; endsAt: Date; timezone: string; url: string }) {
  const format = new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: input.timezone });
  return sendBookingEmail(input.to, `Driving lesson booked with ${input.instructor}`,
    `Hi ${input.name},\n\nYour lesson with ${input.instructor} is confirmed.\nStart: ${format.format(input.startsAt)}\nEnd: ${format.format(input.endsAt)}\n\nView your booking: ${input.url}\n\nIf you need a change, contact your instructor.`);
}
