import type { AccessEmailSender } from "@/application/auth/access-repository";

function parseSender(from: string): { name: string; email: string } {
  const match = from.match(/^(?:(.*)<)?([^>]+)>?$/);
  if (match && match[1]) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: "MyDriveLog", email: from.trim() };
}

export const liveAccessEmailSender: AccessEmailSender = {
  async sendAccessLink({ to, url }) {
    const brevoApiKey = process.env.BREVO_API_KEY;
    const resendApiKey = process.env.RESEND_API_KEY;
    const from = process.env.ACCESS_EMAIL_FROM;
    if ((!brevoApiKey && !resendApiKey) || !from) throw new Error("Access email is not configured");

    const subject = "Your MyDriveLog access link";
    const textContent = `Open this link to sign in to MyDriveLog. It expires in 15 minutes and can only be used once.\n\n${url}\n\nIf you did not request this, you can ignore this email.`;

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
          textContent,
        }),
      });
      if (!response.ok) throw new Error(`Access email via Brevo failed with status ${response.status}`);
      return;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text: textContent,
      }),
    });
    if (!response.ok) throw new Error(`Access email failed with status ${response.status}`);
  },
};

export const resendAccessEmailSender = liveAccessEmailSender;
