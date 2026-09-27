import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { EMAIL_KINDS, EmailProviderLookupError, emailDelivery, monitoringAddress, type EmailKind } from "@/infrastructure/monitoring/email-delivery";
import { hasMonitoringSecret } from "@/infrastructure/monitoring/secret";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  kind: z.enum(Object.keys(EMAIL_KINDS) as [EmailKind, ...EmailKind[]]),
  run: z.string().regex(/^[a-z0-9]{4,16}$/).optional(),
  since: z.number().int().positive(),
  linkToken: z.string().regex(/^[A-Za-z0-9_-]{20,100}$/).optional(),
});

// Monitoring secret required. Only the test inboxes can be queried; see monitoringAddress().
export async function POST(request: NextRequest) {
  if (!hasMonitoringSecret(request.headers)) return new NextResponse(null, { status: 404 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const address = monitoringAddress(parsed.data.kind, parsed.data.run);
  if (!address) return NextResponse.json({ error: "monitoring_inbox_not_configured" }, { status: 409 });
  try {
    const result = await emailDelivery(parsed.data.kind, address, parsed.data.since, parsed.data.linkToken);
    return NextResponse.json({ data: result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    // Brevo rate limits its log API. Tell the journey to back off instead of failing the run.
    if (error instanceof EmailProviderLookupError && error.status === 429) {
      return NextResponse.json({ error: "email_provider_rate_limited" }, { status: 503, headers: { "Retry-After": "20", "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "lookup_failed" }, { status: 502 });
  }
}
