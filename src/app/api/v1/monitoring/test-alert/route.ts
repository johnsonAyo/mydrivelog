import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { monitoringEnvironment } from "@/infrastructure/monitoring/environment";
import { hasMonitoringSecret } from "@/infrastructure/monitoring/secret";
import { sendTelegram } from "@/infrastructure/monitoring/telegram";

export const dynamic = "force-dynamic";

// The journey check asks the deployment itself to send its [TEST] result, which proves the deployed
// Telegram configuration works. When the tested deployment is down, the other environment relays the
// failure (`about` names the environment that failed). Only fixed wording plus a short step is accepted.
export async function POST(request: NextRequest) {
  if (!hasMonitoringSecret(request.headers)) return new NextResponse(null, { status: 404 });
  const body = await request.json().catch(() => null) as { outcome?: unknown; step?: unknown; about?: unknown } | null;
  const here = monitoringEnvironment();
  const about = body?.about === "staging" || body?.about === "production" ? body.about : here;
  const passed = body?.outcome === "passed" && about === here;
  const step = typeof body?.step === "string" ? body.step.replace(/[^\w .,:()"/-]/g, "").slice(0, 240) : "";
  const relay = about !== here ? `\n(Relayed by ${here.toUpperCase()} because ${about.toUpperCase()} could not send it.)` : "";
  const text = passed
    ? `✅ MyDriveLog journey check passed (${about.toUpperCase()}) [TEST]\nSign-in, invitation, booking, email delivery and cleanup all worked.`
    : `🚨 MyDriveLog journey check failed (${about.toUpperCase()}) [TEST]\nFailed at: ${step || "unknown step"}${relay}`;
  try {
    await sendTelegram(text);
  } catch (error) {
    return NextResponse.json({ data: { sent: false, reason: error instanceof Error ? error.message : "unknown" } }, { status: 502 });
  }
  return NextResponse.json({ data: { sent: here !== "development" } });
}
