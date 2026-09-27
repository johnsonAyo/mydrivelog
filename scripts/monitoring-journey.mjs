#!/usr/bin/env node
// Launch journey check, staging only (production gets monitoring-smoke.mjs). Signs in as the dedicated monitoring instructor, invites a test learner,
// books a lesson, confirms every email was delivered, cleans up, and sends a [TEST] Telegram result.
// Delivery checks, the Firebase web key and the Telegram alert all go through the deployment's own
// secret-protected /api/v1/monitoring endpoints, so CI only holds the monitoring and bypass secrets.
// Never point this at a pilot account.
//
// Output is public (GitHub Actions on a public repo): print step names only. Never print codes,
// tokens, email addresses or response bodies.
import { appendFileSync, writeFileSync } from "node:fs";

const env = (name) => process.env[name]?.trim() || undefined;
const baseUrl = env("MONITORING_BASE_URL")?.replace(/\/$/, "");
const expectEnvironment = env("MONITORING_EXPECT_ENVIRONMENT");
const expectRelease = env("MONITORING_EXPECT_RELEASE")?.slice(0, 12);
const instructorEmail = env("MONITORING_TEST_INSTRUCTOR_EMAIL")?.toLowerCase();
const monitoringSecret = env("MONITORING_SECRET");
const bypass = env("VERCEL_AUTOMATION_BYPASS_SECRET");
const runId = Date.now().toString(36);
const learnerEmail = instructorEmail?.replace("@", `+learner-${runId}@`);
// When the tested deployment cannot send its own failure alert, the other environment relays it.
const relayUrl = env("MONITORING_RELAY_URL")?.replace(/\/$/, "");
const EMAIL_TIMEOUT_MS = 180_000;

let step = "configuration";
let cookie;

class JourneyError extends Error {}
function ensure(condition, message) {
  if (!condition) throw new JourneyError(message);
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (message) => console.log(`${new Date().toISOString().slice(11, 19)} ${message}`);

const monitoringHeaders = () => ({ "x-monitoring-secret": monitoringSecret });

async function request(path, { method = "GET", body, headers = {}, base = baseUrl } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    redirect: "manual",
    signal: AbortSignal.timeout(30_000),
    headers: {
      origin: base,
      "user-agent": "mydrivelog-journey-check",
      ...(bypass ? { "x-vercel-protection-bypass": bypass } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON body */ }
  return { status: response.status, data, setCookie: response.headers.getSetCookie?.() ?? [] };
}

function expectStatus(response, status, what) {
  ensure(response.status === status, `${what} returned HTTP ${response.status}${response.data?.code ? ` (${response.data.code})` : ""}`);
  return response.data?.data ?? response.data;
}

// Waits until the deployment's email provider reports the email as delivered to the inbox's mail server.
async function waitForDelivery(kind, since, what, { run, linkToken } = {}) {
  const deadline = Date.now() + EMAIL_TIMEOUT_MS;
  let last = "none";
  while (Date.now() < deadline) {
    const lookup = await request("/api/v1/monitoring/email-delivery", { method: "POST", headers: monitoringHeaders(), body: { kind, run, since, linkToken } });
    if (lookup.status === 503 && lookup.data?.error === "email_provider_rate_limited") {
      last = "rate_limited";
      await sleep(20_000);
      continue;
    }
    const result = expectStatus(lookup, 200, `${what} delivery lookup`);
    last = result.status;
    if (result.status === "failed") throw new JourneyError(`${what} email was not delivered (${result.events.join(", ")})`);
    if (result.status === "delivered") return result;
    await sleep(8_000);
  }
  if (last === "rate_limited") throw new JourneyError(`${what} delivery could not be checked because the email provider kept rate limiting lookups for ${EMAIL_TIMEOUT_MS / 1000}s`);
  throw new JourneyError(last === "none" ? `${what} email never reached the email provider within ${EMAIL_TIMEOUT_MS / 1000}s` : `${what} email was sent but not delivered within ${EMAIL_TIMEOUT_MS / 1000}s`);
}

function mondayWeeksAhead(weeks) {
  const today = new Date();
  const monday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7) + weeks * 7);
  return monday.toISOString().slice(0, 10);
}

async function journey() {
  ensure(baseUrl?.startsWith("https://"), "MONITORING_BASE_URL must be an HTTPS URL");
  ensure(instructorEmail && monitoringSecret, "Journey configuration is incomplete (test instructor email, monitoring secret)");
  // Production gets the read-only smoke check (monitoring-smoke.mjs). The journey writes data, so never there.
  ensure(expectEnvironment === "staging", "The journey runs on staging only. Use scripts/monitoring-smoke.mjs for production");

  step = "deployment health";
  const health = expectStatus(await request("/api/v1/health"), 200, "Health check");
  ensure(health.environment === "staging", `Deployment reports environment "${health.environment}". The journey runs on staging only`);
  if (expectRelease) ensure(health.release === expectRelease, `Deployment runs ${health.release}, expected ${expectRelease}`);
  step = "database readiness";
  expectStatus(await request("/api/v1/ready"), 200, "Database readiness");
  log("✓ Deployment healthy and database ready");

  step = "sign-in code email";
  let signInStarted = Date.now();
  let codeRequest = await request("/api/v1/auth/request", { method: "POST", body: { email: instructorEmail } });
  if (codeRequest.status === 429) { // Another run asked for a code in the last minute.
    log("… sign-in code cooldown, retrying in 65s");
    await sleep(65_000);
    signInStarted = Date.now();
    codeRequest = await request("/api/v1/auth/request", { method: "POST", body: { email: instructorEmail } });
  }
  expectStatus(codeRequest, 202, "Sign-in code request");
  const { code } = await waitForDelivery("sign_in", signInStarted, "Sign-in code");
  ensure(code, "Delivered sign-in email had no code");
  step = "sign-in code verification";
  const { customToken } = expectStatus(await request("/api/v1/auth/verify", { method: "POST", body: { email: instructorEmail, code } }), 200, "Sign-in code verification");
  step = "Firebase sign-in";
  const { firebaseApiKey: firebaseKey } = expectStatus(await request("/api/v1/monitoring/client-config", { headers: monitoringHeaders() }), 200, "Monitoring client config");
  ensure(firebaseKey, "The deployment has no Firebase web API key");
  const firebase = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(firebaseKey)}`, {
    method: "POST", headers: { "content-type": "application/json", referer: `${baseUrl}/` },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }), signal: AbortSignal.timeout(20_000),
  });
  ensure(firebase.ok, `Firebase custom-token sign-in returned HTTP ${firebase.status}`);
  const { idToken } = await firebase.json();
  step = "workspace session";
  const session = await request("/api/v1/auth/session", { method: "POST", body: { idToken } });
  expectStatus(session, 200, "Workspace session");
  cookie = session.setCookie.map((value) => value.split(";")[0]).find((value) => /session/i.test(value.split("=")[0]));
  ensure(cookie, "Workspace session cookie missing");
  if (session.data?.next === "/onboarding") {
    step = "test instructor onboarding";
    expectStatus(await request("/api/v1/auth/onboarding", { method: "POST", body: { firstName: "Monitor" } }), 200, "Test instructor onboarding");
  }
  log("✓ Signed in with a delivered code");

  step = "clear previous test records";
  expectStatus(await request("/api/v1/monitoring/cleanup", { method: "POST", headers: monitoringHeaders() }), 200, "Pre-run cleanup");

  step = "create test week";
  const weekStart = mondayWeeksAhead(3);
  const week = expectStatus(await request("/api/v1/collections", { method: "POST", body: { weekStart } }), 201, "Test week creation");
  step = "add test lesson time";
  const startsAt = new Date(`${weekStart}T10:00:00.000Z`);
  startsAt.setUTCDate(startsAt.getUTCDate() + 1);
  const endsAt = new Date(startsAt.getTime() + 60 * 60_000);
  const slot = expectStatus(await request(`/api/v1/collections/${week.id}/slots`, {
    method: "POST", body: { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), makeAvailable: true },
  }), 201, "Test lesson time");
  log("✓ Test week and lesson time created");

  step = "invite test learner";
  const invitedAt = Date.now();
  const invitation = expectStatus(await request(`/api/v1/collections/${week.id}/share`, {
    method: "POST", body: { kind: "invite", name: "Monitoring Learner", email: learnerEmail },
  }), 201, "Test invitation");
  ensure(invitation.emailStatus === "sent", `Invitation email status was "${invitation.emailStatus}"`);
  const token = new URL(invitation.url).pathname.split("/").at(-1);
  step = "invitation email";
  const invitationEmail = await waitForDelivery("invitation", invitedAt, "Invitation", { run: runId, linkToken: token });
  ensure(invitationEmail.containsLink !== false, "Delivered invitation did not contain its booking link");
  step = "public booking page";
  const offered = expectStatus(await request(`/api/public/collections/${token}`), 200, "Public booking page");
  ensure(offered.slots?.some((item) => item.id === slot.id), "The test lesson time was not offered to the learner");
  log("✓ Invitation delivered and the lesson time is bookable");

  step = "book test lesson";
  const bookedAt = Date.now();
  const booking = expectStatus(await request(`/api/public/collections/${token}`, { method: "POST", body: { action: "claim", slotId: slot.id } }), 201, "Test booking");
  ensure(booking.confirmationEmailStatus === "sent", `Booking confirmation email status was "${booking.confirmationEmailStatus}"`);
  step = "booking confirmation email";
  await waitForDelivery("learner_booking", bookedAt, "Learner booking confirmation", { run: runId });
  step = "instructor booking email";
  await waitForDelivery("instructor_booking", bookedAt, "Instructor booking notification");
  log("✓ Lesson booked; learner and instructor emails delivered");

  step = "cleanup";
  const cleanup = expectStatus(await request("/api/v1/monitoring/cleanup", { method: "POST", headers: monitoringHeaders() }), 200, "Test record cleanup");
  ensure(cleanup.deleted === true && cleanup.counts?.bookings >= 1, "Test records were not cleaned up");
  log("✓ Test records removed");

  step = "Telegram test alert";
  const alert = expectStatus(await request("/api/v1/monitoring/test-alert", {
    method: "POST", headers: monitoringHeaders(), body: { outcome: "passed" },
  }), 200, "Telegram test alert");
  ensure(alert.sent === true, "The deployment did not send the Telegram test alert");
  log("✓ Telegram [TEST] alert sent by the deployment");
}

async function reportFailure(message) {
  if (!monitoringSecret) return;
  if (cookie && expectEnvironment === "staging") await request("/api/v1/monitoring/cleanup", { method: "POST", headers: monitoringHeaders() }).catch(() => undefined);
  const body = { outcome: "failed", step: `${step}: ${message}`, about: expectEnvironment };
  const sentBy = async (base) => {
    const response = await request("/api/v1/monitoring/test-alert", { method: "POST", headers: monitoringHeaders(), body, base }).catch(() => null);
    return response?.status === 200 && response.data?.data?.sent === true;
  };
  if (await sentBy(baseUrl)) return log("Failure alert sent by the deployment");
  if (relayUrl && await sentBy(relayUrl)) return log("Failure alert relayed by the other environment");
  console.error("Could not send the failure alert to Telegram");
}

function writeResult(outcome, message) {
  const summary = outcome === "passed"
    ? `✅ Journey check passed on ${baseUrl}`
    : `❌ Journey check failed at **${step}**: ${message}`;
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
  writeFileSync("journey-result.json", JSON.stringify({ outcome, step, message: message ?? null }));
}

try {
  await journey();
  writeResult("passed");
  log("Journey check passed");
} catch (error) {
  const message = error instanceof JourneyError ? error.message : `Unexpected error: ${error?.name ?? "Error"}`;
  console.error(`Journey check failed at ${step}: ${message}`);
  writeResult("failed", message);
  await reportFailure(message);
  process.exitCode = 1;
}
