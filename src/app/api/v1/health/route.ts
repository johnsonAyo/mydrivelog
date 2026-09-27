import { NextResponse } from "next/server";
import { monitoringEnvironment, monitoringRelease } from "@/infrastructure/monitoring/environment";

export const dynamic = "force-dynamic";

// The journey check reads environment and release to confirm it is testing the build it was triggered for.
export function GET() {
  return NextResponse.json(
    { status: "ok", service: "mydrivelog", environment: monitoringEnvironment(), release: monitoringRelease() ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
