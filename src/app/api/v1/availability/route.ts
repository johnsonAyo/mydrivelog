import type { NextRequest } from "next/server";
import { currentSessionResolver } from "@/infrastructure/auth/current-session-resolver";
import { postgresAvailabilityRepository } from "@/infrastructure/availability/postgres-availability-repository";
import { availabilityRoutes } from "@/presentation/http/availability-routes";

export const dynamic = "force-dynamic";

const routes = availabilityRoutes({
  sessions: currentSessionResolver,
  availability: postgresAvailabilityRepository,
});

export function GET(request: NextRequest) {
  return routes.list(request);
}

export function POST(request: NextRequest) {
  return routes.create(request);
}
