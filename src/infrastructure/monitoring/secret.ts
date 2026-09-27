import { createHash, createHmac, timingSafeEqual } from "node:crypto";

function equal(a: string, b: string): boolean {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}

/** Monitoring-only endpoints require MONITORING_SECRET (32+ chars) in the x-monitoring-secret header. */
export function hasMonitoringSecret(headers: Headers): boolean {
  const expected = process.env.MONITORING_SECRET;
  const sent = headers.get("x-monitoring-secret");
  return Boolean(expected && expected.length >= 32 && sent && equal(sent, expected));
}

/** Sentry integration webhooks sign the raw body with the integration's client secret. */
export function validSentrySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.SENTRY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  return equal(createHmac("sha256", secret).update(rawBody, "utf8").digest("hex"), signature);
}
