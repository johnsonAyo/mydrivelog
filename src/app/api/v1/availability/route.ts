import type { NextRequest } from "next/server";
import { currentSessionResolver } from "@/infrastructure/auth/current-session-resolver";
import { postgresAvailabilityRepository } from "@/infrastructure/availability/postgres-availability-repository";
import { availabilityRoutes } from "@/presentation/http/availability-routes";
import { authenticateRequest } from "@/presentation/http/authenticate-request";
import { queueActivity } from "@/infrastructure/monitoring/telegram";

export const dynamic = "force-dynamic";

const routes = availabilityRoutes({
  sessions: currentSessionResolver,
  availability: postgresAvailabilityRepository,
});

export function GET(request: NextRequest) {
  return routes.list(request);
}

export async function POST(request: NextRequest) {
  const response = await routes.create(request);
  if (response.status === 201) {
    const auth = await authenticateRequest(request, currentSessionResolver);
    if (auth.ok) {
      const payload = await response.clone().json() as { data?: { id?: string } };
      queueActivity({ action: "availability_created", reference: payload.data?.id, actor: auth.session });
    }
  }
  return response;
}
