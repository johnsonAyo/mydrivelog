import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { hasMonitoringSecret } from "@/infrastructure/monitoring/secret";

export const dynamic = "force-dynamic";

// Deliberately throws so the crash path (Sentry + Telegram via onRequestError) can be proven on a live deploy.
export async function POST(request: NextRequest) {
  if (!hasMonitoringSecret(request.headers)) return new NextResponse(null, { status: 404 });
  throw new Error("MyDriveLog monitoring test error (deliberate)");
}
