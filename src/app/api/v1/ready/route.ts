import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getDatabase } from "@/infrastructure/database/client";
import { queueCritical } from "@/infrastructure/monitoring/telegram";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { client } = getDatabase();
    await client`select 1`;
    return NextResponse.json(
      { status: "ready", dependencies: { database: "available" } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const correlationId = randomUUID();
    console.error("Readiness check failed", { correlationId });
    Sentry.captureException(error, { tags: { source: "readiness" } });
    queueCritical({ code: "database_unavailable", route: "/api/v1/ready", status: 503 });
    return NextResponse.json(
      {
        status: "not_ready",
        dependencies: { database: "unavailable" },
        correlationId,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
