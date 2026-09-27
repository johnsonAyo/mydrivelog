import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { recordExpectedError } from "@/infrastructure/monitoring/expected-error-spikes";
import { queueSpike } from "@/infrastructure/monitoring/telegram";

export function problem(status: number, code: string, detail: string, correlationId?: string) {
  if (status >= 400 && status < 500) {
    const safeCode = code.replace(/[^a-z0-9_]/g, "").slice(0, 64);
    Sentry.metrics.count("mydrivelog.expected_http_error", 1, { attributes: { status, code: safeCode } });
    const spike = recordExpectedError(status, safeCode);
    if (spike) queueSpike(spike);
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
