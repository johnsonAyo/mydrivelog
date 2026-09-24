import type { AccessEmailSender } from "@/application/auth/access-repository";

export const resendAccessEmailSender: AccessEmailSender = {
  async sendAccessLink({ to, url }) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.ACCESS_EMAIL_FROM;
    if (!apiKey || !from) throw new Error("Access email is not configured");

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: "Your DriveTrack access link",
        text: `Open this link to sign in to DriveTrack. It expires in 15 minutes and can only be used once.\n\n${url}\n\nIf you did not request this, you can ignore this email.`,
      }),
    });
    if (!response.ok) throw new Error(`Access email failed with status ${response.status}`);
  },
};
