import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { queueCritical } from "@/infrastructure/monitoring/telegram";
import { safeMonitoringPath } from "@/infrastructure/monitoring/sentry-privacy";

// The browser SDK reports its Sentry event id here so a crash reaches Telegram at once.
// Public endpoint: same-origin JSON only, a 32-hex event id, and per-client plus global rate limits.
const EVENT_ID = /^[a-f0-9]{32}$/i;
const PER_CLIENT = 5;
const GLOBAL = 30;
const WINDOW_MS = 60_000;
const recent = new Map<string, { count: number; until: number }>();
let global = { count: 0, until: 0 };

function limited(key: string, now: number): boolean {
  if (global.until < now) global = { count: 0, until: now + WINDOW_MS };
  const entry = recent.get(key);
  const current = entry && entry.until > now ? entry : { count: 0, until: now + WINDOW_MS };
  if (current.count >= PER_CLIENT || global.count >= GLOBAL) return true;
  current.count += 1;
  global.count += 1;
  recent.set(key, current);
  if (recent.size > 200) for (const [k, value] of recent) if (value.until < now) recent.delete(k);
  return false;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return new NextResponse(null, { status: 403 });
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") return new NextResponse(null, { status: 415 });
  const body = await request.json().catch(() => null) as { eventId?: unknown; path?: unknown } | null;
  const eventId = body?.eventId;
  if (typeof eventId !== "string" || !EVENT_ID.test(eventId)) return new NextResponse(null, { status: 400 });
  const key = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (limited(key, Date.now())) return new NextResponse(null, { status: 429 });
  const path = typeof body?.path === "string" && body.path.startsWith("/") ? safeMonitoringPath(body.path.slice(0, 200)) : "/browser";
  queueCritical({ code: "browser_error", route: path, eventId });
  return NextResponse.json({ received: true }, { status: 202 });
}
