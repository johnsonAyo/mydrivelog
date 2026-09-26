import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { postgresAuthRepository } from "@/infrastructure/auth/postgres-auth-repository";
import { problem } from "@/presentation/http/problem";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") && request.headers.get("origin") !== request.nextUrl.origin) return problem(403, "invalid_origin", "This request is not allowed");
  const cookieName = process.env.SESSION_COOKIE_NAME ?? "drivetrack_session";
  const token = request.cookies.get(cookieName)?.value;
  if (token) await postgresAuthRepository.revokeSession(createHash("sha256").update(token).digest("hex"));
  const response = NextResponse.json({ next: "/sign-in" }, { headers: { "Cache-Control": "private, no-store" } });
  response.cookies.delete(cookieName);
  return response;
}
