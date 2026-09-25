import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { currentSessionResolver } from "@/infrastructure/auth/current-session-resolver";
import { getCollectionPreview } from "@/infrastructure/collections/postgres-collection-repository";
import { authenticateRequest } from "@/presentation/http/authenticate-request";
import { problem } from "@/presentation/http/problem";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request, currentSessionResolver);
  if (!auth.ok) return problem(401, "unauthenticated", "Workspace access is required");
  const { id } = await params;
  const kind = request.nextUrl.searchParams.get("kind") === "general" ? "general" : "invitation";
  const preview = await getCollectionPreview(auth.session.workspaceId, id, kind);
  if (!preview) return problem(404, "not_found", "Week not found");
  return NextResponse.json({ data: preview }, { headers: { "Cache-Control": "private, no-store" } });
}
