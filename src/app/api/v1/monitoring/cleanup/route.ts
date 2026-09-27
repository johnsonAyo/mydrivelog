import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { currentSessionResolver } from "@/infrastructure/auth/current-session-resolver";
import { hasMonitoringSecret } from "@/infrastructure/monitoring/secret";
import { deleteMonitoringRecords } from "@/infrastructure/monitoring/test-cleanup";
import { monitoringWorkspaceId } from "@/infrastructure/monitoring/test-workspace";
import { authenticateRequest } from "@/presentation/http/authenticate-request";

export const dynamic = "force-dynamic";

// Locked three ways: the monitoring secret, a signed-in session, and that session must own the
// monitoring workspace (found by MONITORING_TEST_INSTRUCTOR_EMAIL). Anything else is a plain 404.
export async function POST(request: NextRequest) {
  const notFound = () => new NextResponse(null, { status: 404 });
  if (!hasMonitoringSecret(request.headers)) return notFound();
  const auth = await authenticateRequest(request, currentSessionResolver);
  const testWorkspace = await monitoringWorkspaceId();
  if (!auth.ok || !testWorkspace || auth.session.workspaceId !== testWorkspace) return notFound();
  const deleted = await deleteMonitoringRecords(testWorkspace);
  return NextResponse.json({ data: { deleted: true, counts: deleted } }, { headers: { "Cache-Control": "no-store" } });
}
