import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canWriteWorkspace } from "@/application/auth/can-write-workspace";
import { currentSessionResolver } from "@/infrastructure/auth/current-session-resolver";
import { getCollection, renameCollection } from "@/infrastructure/collections/postgres-collection-repository";
import { authenticateRequest } from "@/presentation/http/authenticate-request";
import { collectionNameSchema } from "@/presentation/http/collection-validation";
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

export async function PATCH(request: NextRequest, { params }: RouteContext<"/api/v1/collections/[id]">) {
  const auth = await authenticateRequest(request, currentSessionResolver);
  if (!auth.ok) return problem(401, "unauthenticated", "Workspace access is required");
  if (!canWriteWorkspace(auth.session)) return problem(403, "read_only", "This workspace is read-only");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return problem(404, "not_found", "Availability draft not found");
  const parsed = collectionNameSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return problem(400, "invalid_name", "Give this availability draft a short name");
  if (!await renameCollection(auth.session.workspaceId, id, parsed.data.name)) return problem(404, "not_found", "Availability draft not found");
  return NextResponse.json({ data: await getCollection(auth.session.workspaceId, id) });
}
