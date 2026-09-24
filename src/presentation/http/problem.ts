import { NextResponse } from "next/server";

export function problem(status: number, code: string, detail: string, correlationId?: string) {
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
