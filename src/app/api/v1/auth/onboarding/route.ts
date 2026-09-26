import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { postgresAuthRepository } from "@/infrastructure/auth/postgres-auth-repository";
import { postgresSessionResolver } from "@/infrastructure/auth/postgres-session-resolver";
import { problem } from "@/presentation/http/problem";

const inputSchema = z
  .object({
    fullName: z.string().trim().min(1).max(100).optional(),
    firstName: z.string().trim().min(1).max(100).optional(),
  })
  .refine((data) => Boolean(data.fullName || data.firstName), {
    message: "Enter your first name",
  });

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") && request.headers.get("origin") !== request.nextUrl.origin) return problem(403, "invalid_origin", "This request is not allowed");
  const token = request.cookies.get(process.env.SESSION_COOKIE_NAME ?? "drivetrack_session")?.value;
  const session = await postgresSessionResolver.resolve(token ?? null);
  if (!session) return problem(401, "unauthenticated", "Sign in to continue");
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return problem(400, "invalid_name", "Enter your first name");
  const rawName = (parsed.data.firstName ?? parsed.data.fullName)!.trim();
  const firstName = rawName.split(/\s+/)[0];
  await postgresAuthRepository.completeOnboarding({ identityId: session.identityId, fullName: firstName });
  return NextResponse.json({ next: "/calendar" }, { headers: { "Cache-Control": "private, no-store" } });
}
