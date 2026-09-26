import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentSessionResolver } from "@/infrastructure/auth/current-session-resolver";
import { getCollection } from "@/infrastructure/collections/postgres-collection-repository";
import { authenticateRequest } from "@/presentation/http/authenticate-request";
import { problem } from "@/presentation/http/problem";

export async function GET(request: NextRequest, { params }: RouteContext<"/api/v1/collections/[id]">) {
  const auth = await authenticateRequest(request, currentSessionResolver);
  if (!auth.ok) return problem(401, "unauthenticated", "Workspace access is required");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return problem(404, "not_found", "Availability draft not found");
  const collection = await getCollection(auth.session.workspaceId, id);
  if (!collection) return problem(404, "not_found", "Availability draft not found");
  return NextResponse.json({ data: collection }, { headers: { "Cache-Control": "private, no-store" } });
}
