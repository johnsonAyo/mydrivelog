import * as Sentry from "@sentry/nextjs";
import { after } from "next/server";
import type { SessionContext } from "@/application/auth/session-context";
import { monitoringEnvironment } from "./environment";
import { safeMonitoringPath, scrubMonitoringText } from "./sentry-privacy";

const TIMEOUT_MS = 5_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Activity = {
  action: string;
  reference?: string;
  actor?: Pick<SessionContext, "workspaceId" | "instructorName" | "testingWorkspace">;
  test?: boolean;
};

function safeName(name?: string | null): string {
  return name?.trim().split(/\s+/)[0]?.replace(/[^\p{L}'-]/gu, "").slice(0, 40) || "Instructor";
}

function safeReference(reference?: string): string | undefined {
  return reference && UUID.test(reference) ? reference : undefined;
}

function environmentPrefix(): string {
  return `MyDriveLog [${monitoringEnvironment().toUpperCase()}]`;
}

export async function sendTelegram(text: string): Promise<void> {
  if (monitoringEnvironment() === "development") return;
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

export function queueActivity({ action, reference, actor, test }: Activity): void {
  if (monitoringEnvironment() === "development") return;
  const label = test || actor?.testingWorkspace || actor?.workspaceId === process.env.MONITORING_TEST_WORKSPACE_ID ? " [TEST]" : "";
  const lines = [`✅ ${environmentPrefix()}${label}`, `Action: ${action}`];
  if (actor) lines.push(`Instructor: ${safeName(actor.instructorName)}`);
  const id = safeReference(reference);
  if (id) lines.push(`Ref: ${id}`);
  after(async () => {
    try {
      await sendTelegram(lines.join("\n"));
    } catch (error) {
      Sentry.captureException(error, { tags: { source: "telegram-activity", action } });
      await Sentry.flush(2_000);
    }
  });
}

export async function sendCritical(code: string, route: string, reference?: string, eventId?: string): Promise<void> {
  const path = safeMonitoringPath(route).slice(0, 120);
  const lines = [`🚨 ${environmentPrefix()}`, `Failure: ${scrubMonitoringText(code).replace(/\s+/g, " ").slice(0, 80)}`, `Route: ${path}`];
  const id = safeReference(reference);
  if (id) lines.push(`Ref: ${id}`);
  if (eventId && /^[a-f0-9]{32}$/i.test(eventId)) lines.push(`Sentry event: ${eventId}`);
  await sendTelegram(lines.join("\n"));
}

export function queueFrontendCritical(eventId: string): void {
  if (monitoringEnvironment() === "development") return;
  after(async () => {
    try {
      await sendCritical("frontend_error", "/browser", undefined, eventId);
    } catch (error) {
      Sentry.captureException(error, { tags: { source: "telegram-critical", code: "frontend_error" } });
      await Sentry.flush(2_000);
    }
  });
}

export function queueCritical(code: string, route: string, reference?: string): void {
  if (monitoringEnvironment() === "development") return;
  Sentry.captureMessage(`MyDriveLog critical: ${scrubMonitoringText(code)}`, {
    level: "error", tags: { source: "launch-monitoring", route: safeMonitoringPath(route) },
  });
  after(async () => {
    try {
      await sendCritical(code, route, reference);
    } catch (error) {
      Sentry.captureException(error, { tags: { source: "telegram-critical", code } });
      await Sentry.flush(2_000);
    }
  });
}
