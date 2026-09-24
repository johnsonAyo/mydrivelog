import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getDatabase } from "@/infrastructure/database/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { client } = getDatabase();
    await client`select 1`;
    return NextResponse.json(
      { status: "ready", dependencies: { database: "available" } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    const correlationId = randomUUID();
    console.error("Readiness check failed", { correlationId });
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
