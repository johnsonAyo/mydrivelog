import * as Sentry from "@sentry/nextjs";
import { after } from "next/server";
import type { SessionContext } from "@/application/auth/session-context";
import { monitoringEnvironment } from "./environment";
import { safeMonitoringPath, scrubMonitoringText } from "./sentry-privacy";
import { bookingOwner, isMonitoringWorkspace } from "./test-workspace";
import { formatSpike, type Spike } from "./expected-error-spikes";

const TIMEOUT_MS = 5_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SENTRY_EVENT = /^[a-f0-9]{32}$/i;

/** Telegram is only used by deployed staging and production. Local runs and tests never send. */
export function monitoringEnabled(): boolean {
  return monitoringEnvironment() !== "development";
}

export async function sendTelegram(text: string): Promise<void> {
  if (!monitoringEnabled()) return;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) throw new Error("Telegram monitoring credentials are missing");
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 3900), disable_web_page_preview: true }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Telegram monitoring delivery failed (${response.status})`);
}

/** Runs after the response is sent. A monitoring failure never reaches the user and is reported to Sentry. */
function inBackground(source: string, task: () => Promise<void>): void {
  const run = async () => {
    try {
      await task();
    } catch (error) {
      Sentry.captureException(error, { tags: { source } });
      await Sentry.flush(2_000).catch(() => false);
    }
  };
  try {
    after(run);
  } catch {
    void run(); // Outside a request scope (for example during instrumentation).
  }
}

const environmentLabel = () => monitoringEnvironment().toUpperCase();
const safeReference = (reference?: string) => reference && UUID.test(reference) ? reference : undefined;

export function safeFirstName(name?: string | null): string | undefined {
  return name?.trim().split(/\s+/)[0]?.replace(/[^\p{L}'-]/gu, "").slice(0, 40) || undefined;
}

// Human wording for every activity code. Unknown codes fall back to the code itself.
const ACTIVITY_LABELS: Record<string, string> = {
  instructor_signed_up: "Finished signing up",
  instructor_logged_in: "Signed in",
  instructor_signed_in_onboarding: "Signed in (onboarding not finished yet)",
  week_created: "Created an availability week",
  lesson_time_created: "Added a lesson time",
  lesson_time_edited: "Moved a lesson time",
  lesson_time_open: "Made a lesson time bookable",
  lesson_time_private: "Made a lesson time private",
  general_booking_link_created: "Created a general booking link",
  learner_invitation_created: "Invited a learner to book",
  learner_created: "Added a learner",
  learner_edited: "Edited a learner",
  booking_confirmed: "Learner booked a lesson",
  booking_cancel_by_learner: "Learner cancelled a lesson",
  booking_reschedule_by_learner: "Learner moved a lesson",
  booking_cancel_by_instructor: "Cancelled a lesson",
  booking_reschedule_by_instructor: "Moved a lesson",
  booking_access_requested: "Learner requested a booking link",
  lesson_notes_saved: "Saved lesson notes",
  lesson_completed: "Completed a lesson",
  recap_send_requested: "Sent a lesson recap",
  follow_up_send_requested: "Sent a follow-up",
  lesson_message_retried: "Retried a lesson email",
  scheduling_settings_edited: "Changed scheduling settings",
  availability_created: "Created an availability window",
  availability_edited: "Edited an availability window",
  availability_released: "Shared an availability window",
};

export type Activity = {
  action: string;
  reference?: string;
  actor?: Pick<SessionContext, "workspaceId" | "instructorName">;
  /** Learner-side actions: the booking identifies the instructor and whether it is the test workspace. */
  bookingId?: string;
  /** Deferred lookups run after the response, so the request never waits on them. */
  resolve?: () => Promise<Partial<Omit<Activity, "resolve">>>;
};

// Autosave writes lesson notes while the instructor types. One message per lesson per window is enough.
const THROTTLED_ACTIVITY: Record<string, number> = { lesson_notes_saved: 30 * 60_000 };
const lastActivity = new Map<string, number>();

function throttled(action: string, reference?: string): boolean {
  const windowMs = THROTTLED_ACTIVITY[action];
  if (!windowMs) return false;
  const key = `${action}:${reference ?? ""}`;
  const now = Date.now();
  if ((lastActivity.get(key) ?? 0) > now - windowMs) return true;
  lastActivity.set(key, now);
  if (lastActivity.size > 500) for (const [k, at] of lastActivity) if (at < now - windowMs) lastActivity.delete(k);
  return false;
}

export async function formatActivity(activity: Activity): Promise<string> {
  const { action, reference, actor, bookingId } = { ...activity, ...(await activity.resolve?.()) };
  let workspaceId = actor?.workspaceId;
  let instructor = safeFirstName(actor?.instructorName);
  if (!actor && bookingId) {
    const owner = await bookingOwner(bookingId);
    workspaceId = owner?.workspaceId;
    instructor = safeFirstName(owner?.instructorName);
  }
  const test = await isMonitoringWorkspace(workspaceId) ? " [TEST]" : "";
  const heading = action === "instructor_signed_up"
    ? `🆕 MyDriveLog new signup (${environmentLabel()})${test}`
    : `📣 MyDriveLog activity (${environmentLabel()})${test}`;
  const lines = [heading, `Action: ${ACTIVITY_LABELS[action] ?? scrubMonitoringText(action).slice(0, 80)}`];
  if (instructor) lines.push(`Instructor: ${instructor}`);
  const ref = safeReference(reference);
  if (ref) lines.push(`Ref: ${ref}`);
  return lines.join("\n");
}

/** Fire-and-forget activity message. Never blocks or fails the request. */
export function queueActivity(activity: Activity): void {
  if (!monitoringEnabled() || throttled(activity.action, activity.reference)) return;
  inBackground("telegram-activity", async () => sendTelegram(await formatActivity(activity)));
}

// A failing dependency can fail every request. Repeat alerts for the same failure are folded into one per minute.
const CRITICAL_WINDOW_MS = 60_000;
const lastCritical = new Map<string, { at: number; suppressed: number }>();

function criticalAllowed(key: string): { allowed: boolean; suppressed: number } {
  const now = Date.now();
  const entry = lastCritical.get(key);
  if (entry && entry.at > now - CRITICAL_WINDOW_MS) {
    entry.suppressed += 1;
    return { allowed: false, suppressed: 0 };
  }
  lastCritical.set(key, { at: now, suppressed: 0 });
  if (lastCritical.size > 200) for (const [k, value] of lastCritical) if (value.at < now - CRITICAL_WINDOW_MS) lastCritical.delete(k);
  return { allowed: true, suppressed: entry?.suppressed ?? 0 };
}

export type Critical = { code: string; route?: string; status?: number; reference?: string; eventId?: string };

export function formatCritical({ code, route, status, reference, eventId }: Critical, suppressed = 0): string {
  const lines = [`🚨 MyDriveLog failure (${environmentLabel()})`, `Failure: ${scrubMonitoringText(code).replace(/\s+/g, " ").slice(0, 80)}${status ? ` (${status})` : ""}`];
  if (route) lines.push(`Route: ${safeMonitoringPath(route).slice(0, 120)}`);
  const ref = safeReference(reference);
  if (ref) lines.push(`Ref: ${ref}`);
  if (eventId && SENTRY_EVENT.test(eventId)) lines.push(`Sentry event: ${eventId}`);
  if (suppressed) lines.push(`Repeated ${suppressed} more time(s) in the last minute`);
  return lines.join("\n");
}

/** Sends a critical alert now. Used where there is no request scope to defer to. */
export async function sendCritical(critical: Critical): Promise<void> {
  const { allowed, suppressed } = criticalAllowed(`${critical.code}|${critical.route ?? ""}`);
  if (!allowed) return;
  await sendTelegram(formatCritical(critical, suppressed));
}

/** Records the failure in Sentry and alerts Telegram after the response is sent. */
export function queueCritical(critical: Critical): void {
  if (!monitoringEnabled()) return;
  const eventId = critical.eventId ?? (!Sentry.getClient() ? undefined : Sentry.captureMessage(`MyDriveLog critical: ${scrubMonitoringText(critical.code)}`, {
    level: "error",
    tags: { source: "launch-monitoring", code: critical.code.slice(0, 64), ...(critical.route ? { route: safeMonitoringPath(critical.route) } : {}) },
  }));
  inBackground("telegram-critical", () => sendCritical({ ...critical, eventId }));
}

// Bursts of expected errors (see expected-error-spikes.ts). Fire-and-forget like every other alert.
export function queueSpike(spike: Spike): void {
  if (!monitoringEnabled()) return;
  inBackground("telegram-spike", () => sendTelegram(formatSpike(spike, monitoringEnvironment())));
}
