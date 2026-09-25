import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentSessionResolver } from "@/infrastructure/auth/current-session-resolver";
import { getCalendarBookings } from "@/infrastructure/booking/postgres-booking-repository";
import { authenticateRequest } from "@/presentation/http/authenticate-request";
import { problem } from "@/presentation/http/problem";

const range = z.object({ from: z.iso.datetime({ offset: true }), to: z.iso.datetime({ offset: true }) });

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, currentSessionResolver);
  if (!auth.ok) return problem(401, "unauthenticated", "Workspace access is required");
  const parsed = range.safeParse({ from: request.nextUrl.searchParams.get("from"), to: request.nextUrl.searchParams.get("to") });
  if (!parsed.success || new Date(parsed.data.to) <= new Date(parsed.data.from)) return problem(400, "invalid_range", "Choose a valid calendar range");
  const data = await getCalendarBookings(auth.session.workspaceId, new Date(parsed.data.from), new Date(parsed.data.to));
  return NextResponse.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
}
