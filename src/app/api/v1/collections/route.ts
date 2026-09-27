import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { canWriteWorkspace } from "@/application/auth/can-write-workspace";
import { currentSessionResolver } from "@/infrastructure/auth/current-session-resolver";
import { createCollection, listCollections, listContacts } from "@/infrastructure/collections/postgres-collection-repository";
import { queueActivity } from "@/infrastructure/monitoring/telegram";
import { authenticateRequest } from "@/presentation/http/authenticate-request";
import { collectionWeekSchema } from "@/presentation/http/collection-validation";
import { problem } from "@/presentation/http/problem";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, currentSessionResolver);
  if (!auth.ok) return problem(401, "unauthenticated", "Workspace access is required");
  const [collections, contacts] = await Promise.all([listCollections(auth.session.workspaceId), listContacts(auth.session.workspaceId)]);
  return NextResponse.json({ data: { collections, contacts } }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, currentSessionResolver);
  if (!auth.ok) return problem(401, "unauthenticated", "Workspace access is required");
  if (!canWriteWorkspace(auth.session)) return problem(403, "read_only", "This workspace is read-only");
  const parsed = collectionWeekSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return problem(400, "invalid_week", "Choose a week beginning on Monday");
  const collection = await createCollection(auth.session.workspaceId, parsed.data.weekStart);
  if (collection.created) queueActivity({ action: "week_created", reference: collection.id, actor: auth.session });
  const data = { id: collection.id, name: collection.name, weekStart: collection.weekStart, status: collection.status };
  return NextResponse.json({ data }, { status: 201 });
}
