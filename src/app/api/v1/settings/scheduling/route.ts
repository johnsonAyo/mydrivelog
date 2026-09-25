import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canWriteWorkspace } from "@/application/auth/can-write-workspace";
import { authenticateRequest } from "@/presentation/http/authenticate-request";
import { problem } from "@/presentation/http/problem";
import { currentSessionResolver } from "@/infrastructure/auth/current-session-resolver";
import { getDatabase } from "@/infrastructure/database/client";
import { workspaces } from "@/infrastructure/database/schema";

const settingsSchema = z.object({
  name: z.string().trim().min(2).max(100),
  defaultSessionMinutes: z.union([z.literal(30), z.literal(45), z.literal(60), z.literal(90), z.literal(120), z.literal(150), z.literal(180), z.literal(240)]),
  bufferWarningMinutes: z.union([z.literal(0), z.literal(15), z.literal(30), z.literal(45), z.literal(60)]),
  weeklyBookingAllowance: z.enum(["unlimited", "two", "one"]),
});

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, currentSessionResolver);
  if (!auth.ok) return problem(401, "unauthenticated", "Workspace access is required");
  const { db } = getDatabase();
  const [workspace] = await db.select({
    name: workspaces.name,
    timezone: workspaces.timezone,
    defaultSessionMinutes: workspaces.defaultSessionMinutes,
    bufferWarningMinutes: workspaces.bufferWarningMinutes,
    weeklyBookingAllowance: workspaces.weeklyBookingAllowance,
  }).from(workspaces).where(eq(workspaces.id, auth.session.workspaceId)).limit(1);
  if (!workspace) return problem(404, "not_found", "Workspace not found");
  return NextResponse.json({ data: workspace }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticateRequest(request, currentSessionResolver);
  if (!auth.ok) return problem(401, "unauthenticated", "Workspace access is required");
  if (!canWriteWorkspace(auth.session)) return problem(403, "read_only", "This workspace is read-only");
  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return problem(400, "invalid_settings", "Add your name and choose valid booking rules");
  const { db } = getDatabase();
  const [workspace] = await db.update(workspaces).set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(workspaces.id, auth.session.workspaceId)).returning({
      name: workspaces.name,
      timezone: workspaces.timezone,
      defaultSessionMinutes: workspaces.defaultSessionMinutes,
      bufferWarningMinutes: workspaces.bufferWarningMinutes,
      weeklyBookingAllowance: workspaces.weeklyBookingAllowance,
    });
  return NextResponse.json({ data: workspace }, { headers: { "Cache-Control": "private, no-store" } });
}
