import type { NextRequest } from "next/server";
import { liveAuthRoutes } from "@/presentation/http/live-auth-routes";

export const dynamic = "force-dynamic";

export function POST(request: NextRequest) {
  return liveAuthRoutes().requestCode(request);
}
