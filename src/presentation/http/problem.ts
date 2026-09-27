import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export function problem(status: number, code: string, detail: string, correlationId?: string) {
  if (status >= 400 && status < 500) {
    Sentry.metrics.count("mydrivelog.expected_http_error", 1, {
      attributes: { status, code: code.replace(/[^a-z0-9_]/g, "").slice(0, 64) },
    });
  }
  return NextResponse.json(
    {
      type: `https://drivetrack.uk/problems/${code}`,
      title: detail,
      status,
      code,
      ...(correlationId ? { correlationId } : {}),
    },
    { status },
  );
}
