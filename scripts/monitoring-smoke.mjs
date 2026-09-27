#!/usr/bin/env node
// Production smoke check. Read-only: it signs nobody in, creates no account, booking or email, and
// writes nothing to the database. It runs after every production deploy instead of the full journey,
// which runs on staging only (the gate for main).
//
// Checks: health (environment and release), database readiness, the sign-in page and its Firebase
// config, and that auth and public booking endpoints reject empty input with 4xx, not 5xx.
// Output is public (GitHub Actions on a public repo): print step names only, never keys or bodies.
import { appendFileSync, writeFileSync } from "node:fs";

const env = (name) => process.env[name]?.trim() || undefined;
const baseUrl = env("MONITORING_BASE_URL")?.replace(/\/$/, "");
const expectEnvironment = env("MONITORING_EXPECT_ENVIRONMENT") ?? "production";
const expectRelease = env("MONITORING_EXPECT_RELEASE")?.slice(0, 12);
const monitoringSecret = env("MONITORING_SECRET");
const bypass = env("VERCEL_AUTOMATION_BYPASS_SECRET");
const relayUrl = env("MONITORING_RELAY_URL")?.replace(/\/$/, "");

let step = "configuration";
class SmokeError extends Error {}
const ensure = (condition, message) => { if (!condition) throw new SmokeError(message); };
const log = (message) => console.log(`${new Date().toISOString().slice(11, 19)} ${message}`);

async function request(path, { method = "GET", body, headers = {}, base = baseUrl } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    redirect: "manual",
    signal: AbortSignal.timeout(30_000),
    headers: {
      origin: base,
      "user-agent": "mydrivelog-smoke-check",
      ...(bypass ? { "x-vercel-protection-bypass": bypass } : {}),
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* HTML or JS */ }
  return { status: response.status, data, text };
}

// Rejecting bad input must be a 4xx. A 5xx here means the route or its dependencies are broken.
async function expectRejected(path, what, body = {}) {
  const response = await request(path, { method: body === null ? "GET" : "POST", body: body === null ? undefined : body });
  ensure(response.status >= 400 && response.status < 500, `${what} returned HTTP ${response.status}, expected a 4xx rejection`);
}

async function smoke() {
  ensure(baseUrl?.startsWith("https://"), "MONITORING_BASE_URL must be an HTTPS URL");

  step = "deployment health";
  const health = await request("/api/v1/health");
  ensure(health.status === 200, `Health check returned HTTP ${health.status}`);
  ensure(health.data?.environment === expectEnvironment, `Deployment reports environment "${health.data?.environment}", expected "${expectEnvironment}"`);
  if (expectRelease) ensure(health.data?.release === expectRelease, `Deployment runs ${health.data?.release}, expected ${expectRelease}`);
  step = "database readiness";
  const ready = await request("/api/v1/ready");
  ensure(ready.status === 200, `Database readiness returned HTTP ${ready.status}`);
  log("✓ Deployment healthy and database ready");

  step = "sign-in page";
  const page = await request("/sign-in");
  ensure(page.status === 200, `Sign-in page returned HTTP ${page.status}`);
  const chunks = [...new Set(page.text.match(/\/_next\/static\/[^"' ]+\.js/g) ?? [])];
  ensure(chunks.length > 0, "Sign-in page lists no JavaScript bundles");
  step = "Firebase config";
  let config = null;
  for (const chunk of chunks.slice(0, 60)) {
    const js = await request(chunk);
    if (js.status !== 200 || !js.text.includes("Firebase sign-in is not configured")) continue;
    config = js.text.match(/="(AIza[\w-]{20,})",\w+="([a-z0-9-]+(?:\.[a-z0-9-]+)+)",\w+="([a-z0-9-]{4,40})"/);
    break;
  }
  ensure(config, "The sign-in bundle does not contain a Firebase API key, auth domain and project id");
  log("✓ Sign-in page loads with its Firebase config");

  step = "auth endpoints reject empty input";
  await expectRejected("/api/v1/auth/request", "Sign-in code request");
  await expectRejected("/api/v1/auth/verify", "Sign-in code check");
  await expectRejected("/api/v1/auth/session", "Session start");
  step = "public booking endpoints reject unknown links";
  // A well-formed token that cannot exist: exercises the database lookup and writes nothing.
  const token = `smoke-check-${"0".repeat(40)}`;
  await expectRejected(`/api/public/collections/${token}`, "Public booking page lookup", null);
  await expectRejected(`/api/public/collections/${token}`, "Public booking request");
  log("✓ Auth and public booking endpoints reject bad input with 4xx");
}

async function reportFailure(message) {
  if (!monitoringSecret) return;
  const body = { outcome: "failed", check: "smoke", step: `${step}: ${message}`, about: expectEnvironment };
  const sentBy = async (base) => {
    const response = await request("/api/v1/monitoring/test-alert", { method: "POST", headers: { "x-monitoring-secret": monitoringSecret }, body, base }).catch(() => null);
    return response?.status === 200 && response.data?.data?.sent === true;
  };
  if (await sentBy(baseUrl)) return log("Failure alert sent by the deployment");
  if (relayUrl && await sentBy(relayUrl)) return log("Failure alert relayed by the other environment");
  console.error("Could not send the failure alert to Telegram");
}

function writeResult(outcome, message) {
  const summary = outcome === "passed" ? `✅ Smoke check passed on ${baseUrl}` : `❌ Smoke check failed at **${step}**: ${message}`;
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
  writeFileSync("journey-result.json", JSON.stringify({ outcome, step, message: message ?? null, check: "smoke" }));
}

try {
  await smoke();
  writeResult("passed");
  log("Smoke check passed");
} catch (error) {
  const message = error instanceof SmokeError ? error.message : `Unexpected error: ${error?.name ?? "Error"}`;
  console.error(`Smoke check failed at ${step}: ${message}`);
  writeResult("failed", message);
  await reportFailure(message);
  process.exitCode = 1;
}
