import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { validSentrySignature } from "@/infrastructure/monitoring/secret";
import { scrubMonitoringText } from "@/infrastructure/monitoring/sentry-privacy";
import { sendTelegram } from "@/infrastructure/monitoring/telegram";

export const dynamic = "force-dynamic";

type SentryAlert = {
  action?: string;
  data?: {
    metric_alert?: { alert_rule?: { name?: string }; title?: string };
    event?: { title?: string; environment?: string; web_url?: string };
    triggered_rule?: string;
    description_title?: string;
    web_url?: string;
  };
};

// Sentry alert rules (for example a spike in expected 4xx errors) post here through a Sentry
// internal integration. Signed with SENTRY_WEBHOOK_SECRET; forwarded to Telegram in one short message.
export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (!validSentrySignature(raw, request.headers.get("sentry-hook-signature"))) return new NextResponse(null, { status: 401 });
  let payload: SentryAlert;
  try { payload = JSON.parse(raw) as SentryAlert; } catch { return new NextResponse(null, { status: 400 }); }
  const resource = request.headers.get("sentry-hook-resource");
  if (resource !== "metric_alert" && resource !== "event_alert") return NextResponse.json({ ignored: true });
  const data = payload.data ?? {};
  const rule = data.metric_alert?.alert_rule?.name ?? data.triggered_rule ?? "Sentry alert";
  const title = data.description_title ?? data.metric_alert?.title ?? data.event?.title ?? "";
  const resolved = payload.action === "resolved";
  const lines = [`${resolved ? "✅" : "📈"} MyDriveLog Sentry ${resolved ? "alert resolved" : "alert"}`, `Rule: ${scrubMonitoringText(rule).slice(0, 120)}`];
  if (title) lines.push(`Detail: ${scrubMonitoringText(title).slice(0, 200)}`);
  if (data.event?.environment) lines.push(`Environment: ${scrubMonitoringText(data.event.environment).slice(0, 20)}`);
  const link = data.web_url ?? data.event?.web_url;
  if (link?.startsWith("https://") && new URL(link).hostname.endsWith("sentry.io")) lines.push(link);
  await sendTelegram(lines.join("\n"));
  return NextResponse.json({ received: true });
}
