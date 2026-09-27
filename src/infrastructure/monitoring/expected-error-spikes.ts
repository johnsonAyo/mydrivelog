// App-side spike alert for expected errors (wrong code, expired or unknown link, slot conflict, validation).
// Each one alone is normal and goes to Sentry only. A burst of them usually means something is broken
// (a form sending bad data, a dead link in an email) or someone is guessing codes, so a burst goes to Telegram.
//
// Deliberately simple and DB-free: counts live in this server instance's memory. That suits serverless but
// has honest limits. Counts are per instance, so traffic spread across many instances can stay under the
// threshold, and a cold start resets the window. It catches concentrated bursts, not slow drifts.

export type ExpectedErrorGroup = "sign_in" | "link" | "slot" | "validation";

const GROUP_LABELS: Record<ExpectedErrorGroup, string> = {
  sign_in: "Sign-in codes rejected",
  link: "Links not found or expired",
  slot: "Lesson time conflicts",
  validation: "Rejected form input",
};

const SIGN_IN = new Set(["invalid_code", "code_rate_limited", "invalid_identity", "unverified_email"]);
const SLOT = new Set(["unavailable", "overlap", "availability_overlap", "revision_conflict", "conflict", "cancelled", "not_editable"]);

export const SPIKE_WINDOW_MS = 10 * 60_000;
export const SPIKE_THRESHOLD = 20;
export const SPIKE_COOLDOWN_MS = 30 * 60_000;

// Session expiry (401 unauthenticated), read-only pilots and bad origins are routine noise, so they are not counted.
export function expectedErrorGroup(status: number, code: string): ExpectedErrorGroup | null {
  if (status < 400 || status >= 500) return null;
  if (SIGN_IN.has(code)) return "sign_in";
  if (SLOT.has(code)) return "slot";
  if (status === 404 || code === "not_found") return "link";
  if (status === 400 && (code.startsWith("invalid_") || code === "duplicate_recipient")) return "validation";
  return null;
}

export type Spike = { group: ExpectedErrorGroup; count: number; codes: [string, number][] };

type Hit = { at: number; code: string };
const hits = new Map<ExpectedErrorGroup, Hit[]>();
const lastAlert = new Map<ExpectedErrorGroup, number>();

// Records one expected error. Returns a spike the first time a group reaches the threshold inside the
// window, then stays quiet for that group until the cooldown has passed.
export function recordExpectedError(status: number, code: string, now = Date.now()): Spike | null {
  const group = expectedErrorGroup(status, code);
  if (!group) return null;
  const recent = (hits.get(group) ?? []).filter((hit) => now - hit.at < SPIKE_WINDOW_MS);
  recent.push({ at: now, code });
  hits.set(group, recent.slice(-SPIKE_THRESHOLD * 5));
  if (recent.length < SPIKE_THRESHOLD) return null;
  const previous = lastAlert.get(group);
  if (previous !== undefined && now - previous < SPIKE_COOLDOWN_MS) return null;
  lastAlert.set(group, now);
  const counts = new Map<string, number>();
  for (const hit of recent) counts.set(hit.code, (counts.get(hit.code) ?? 0) + 1);
  return { group, count: recent.length, codes: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5) };
}

export function formatSpike(spike: Spike, environment: string): string {
  return [
    `⚠️ MyDriveLog expected-error spike (${environment.toUpperCase()})`,
    `What: ${GROUP_LABELS[spike.group]}`,
    `Count: ${spike.count} in ${SPIKE_WINDOW_MS / 60_000} min on one server instance`,
    `Codes: ${spike.codes.map(([code, count]) => `${code} ×${count}`).join(", ")}`,
  ].join("\n");
}

export function resetExpectedErrorSpikes(): void {
  hits.clear();
  lastAlert.clear();
}
