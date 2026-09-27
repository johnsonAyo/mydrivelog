import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { queueFrontendCritical } from "@/infrastructure/monitoring/telegram";

const recent = new Map<string, { count: number; until: number }>();
const EVENT_ID = /^[a-f0-9]{32}$/i;

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return new NextResponse(null, { status: 403 });
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") return new NextResponse(null, { status: 415 });
  const body: unknown = await request.json().catch(() => null);
  const eventId = typeof body === "object" && body !== null && "eventId" in body ? (body as { eventId: unknown }).eventId : null;
  if (typeof eventId !== "string" || !EVENT_ID.test(eventId)) return new NextResponse(null, { status: 400 });
  const key = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0] ?? "global";
  const now = Date.now();
  const entry = recent.get(key);
  if (entry && entry.until > now && entry.count >= 5) return new NextResponse(null, { status: 429 });
  recent.set(key, { count: entry && entry.until > now ? entry.count + 1 : 1, until: now + 60_000 });
  if (recent.size > 200) for (const [k, value] of recent) if (value.until < now) recent.delete(k);
  queueFrontendCritical(eventId);
  return NextResponse.json({ received: true }, { status: 202 });
}
