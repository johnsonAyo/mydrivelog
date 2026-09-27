// Journey check support: looks up delivery of the emails sent to the monitoring inboxes, using the
// deployment's own Brevo account. Only the test instructor and its +learner-<run> aliases can be queried.
export const EMAIL_KINDS = {
  sign_in: { to: "instructor", subject: /^\d{6} is your MyDriveLog sign-in code$/ },
  invitation: { to: "learner", subject: /has lesson times for you$/ },
  learner_booking: { to: "learner", subject: /^Driving lesson booked with / },
  instructor_booking: { to: "instructor", subject: /^Lesson booked by / },
} as const;
export type EmailKind = keyof typeof EMAIL_KINDS;

export type DeliveryResult =
  | { status: "none" | "pending" }
  | { status: "failed"; events: string[] }
  | { status: "delivered"; code?: string; containsLink?: boolean };

type BrevoListItem = { uuid: string; subject?: string; date: string };
type BrevoDetail = { subject?: string; body?: string; events?: { name?: string; event?: string }[] };

export function monitoringAddress(kind: EmailKind, run?: string): string | null {
  const instructor = process.env.MONITORING_TEST_INSTRUCTOR_EMAIL?.trim().toLowerCase();
  if (!instructor || !instructor.includes("@")) return null;
  if (EMAIL_KINDS[kind].to === "instructor") return instructor;
  if (!run || !/^[a-z0-9]{4,16}$/.test(run)) return null;
  return instructor.replace("@", `+learner-${run}@`);
}

async function brevo<T>(path: string): Promise<T> {
  const key = process.env.BREVO_API_KEY;
  if (!key) throw new Error("Brevo is not configured");
  const response = await fetch(`https://api.brevo.com/v3${path}`, {
    headers: { "api-key": key, accept: "application/json" }, signal: AbortSignal.timeout(10_000), cache: "no-store",
  });
  if (!response.ok) throw new Error(`Brevo lookup failed (${response.status})`);
  return response.json() as Promise<T>;
}

export async function emailDelivery(kind: EmailKind, address: string, since: number, linkToken?: string): Promise<DeliveryResult> {
  const list = await brevo<{ transactionalEmails?: BrevoListItem[] }>(`/smtp/emails?email=${encodeURIComponent(address)}&limit=20&sort=desc`);
  const matches = (list.transactionalEmails ?? [])
    .filter((item) => new Date(item.date).getTime() >= since - 60_000 && EMAIL_KINDS[kind].subject.test(item.subject ?? ""))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  if (!matches.length) return { status: "none" };
  const detail = await brevo<BrevoDetail>(`/smtp/emails/${encodeURIComponent(matches[0].uuid)}`);
  const events = (detail.events ?? []).map((entry) => String(entry.name ?? entry.event ?? "").toLowerCase());
  if (events.some((name) => /bounce|blocked|invalid|error|spam|deferred/.test(name))) return { status: "failed", events: events.slice(0, 10) };
  if (!events.some((name) => name.includes("deliver"))) return { status: "pending" };
  return {
    status: "delivered",
    ...(kind === "sign_in" ? { code: detail.subject?.match(/^(\d{6})/)?.[1] } : {}),
    ...(linkToken ? { containsLink: Boolean(detail.body?.includes(linkToken)) } : {}),
  };
}
