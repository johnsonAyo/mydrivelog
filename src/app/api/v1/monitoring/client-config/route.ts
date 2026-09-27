import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { hasMonitoringSecret } from "@/infrastructure/monitoring/secret";

export const dynamic = "force-dynamic";

// The journey check signs in to Firebase like the browser does. The web API key is already public in
// the page bundle; serving it here keeps the check matched to whichever deployment it is testing.
export async function GET(request: NextRequest) {
  if (!hasMonitoringSecret(request.headers)) return new NextResponse(null, { status: 404 });
  return NextResponse.json({ data: { firebaseApiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? null } }, { headers: { "Cache-Control": "no-store" } });
}
