#!/usr/bin/env node
// Runs only against the dedicated monitoring instructor. Do not point this at a pilot account.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const baseUrl = process.env.MONITORING_BASE_URL;
const instructorEmail = process.env.MONITORING_TEST_INSTRUCTOR_EMAIL;
const brevoKey = process.env.MONITORING_BREVO_API_KEY ?? process.env.BREVO_API_KEY;
const firebaseKey = process.env.MONITORING_FIREBASE_API_KEY ?? process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const protectedDeployment = process.env.MONITORING_USE_VERCEL_CURL === "1";
const runId = Date.now().toString(36);
const learnerEmail = process.env.MONITORING_TEST_LEARNER_EMAIL ?? instructorEmail?.replace("@", `+learner-${runId}@`);
const pollDelayMs = 2_000;

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

ensure(baseUrl && /^https:\/\//.test(baseUrl), "MONITORING_BASE_URL must be an HTTPS URL");
ensure(instructorEmail && learnerEmail && brevoKey && firebaseKey, "Monitoring emails, Brevo API key, and Firebase API key are required");
ensure(instructorEmail !== learnerEmail, "The test learner needs a distinct address");

async function request(path, { method = "GET", body, cookie } = {}) {
  if (!protectedDeployment) {
    const response = await fetch(new URL(path, baseUrl), {
      method, headers: { ...(body ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined, redirect: "manual", signal: AbortSignal.timeout(30_000),
    });
    return { status: response.status, data: await response.json().catch(() => null), setCookie: response.headers.get("set-cookie") };
  }
  const directory = mkdtempSync(join(tmpdir(), "mydrivelog-journey-"));
  try {
    const headerFile = join(directory, "headers");
    const bodyFile = join(directory, "body");
    const args = ["--yes", "vercel@latest", "curl", path, "--deployment", baseUrl, "--", "--silent", "--show-error", "--dump-header", headerFile, "--output", bodyFile, "--request", method];
    if (body) args.push("--header", "Content-Type: application/json", "--data", JSON.stringify(body));
    if (cookie) args.push("--header", `Cookie: ${cookie}`);
    const result = spawnSync("npx", args, { encoding: "utf8", timeout: 45_000, maxBuffer: 1024 * 1024 });
    ensure(result.status === 0, `Protected deployment request failed at ${path}`);
    const headers = readFileSync(headerFile, "utf8");
    const responseText = readFileSync(bodyFile, "utf8");
    const status = Number([...headers.matchAll(/^HTTP\/\S+\s+(\d+)/gm)].at(-1)?.[1]);
    const setCookie = [...headers.matchAll(/^set-cookie:\s*(.+)$/gim)].at(-1)?.[1] ?? null;
    return { status, data: JSON.parse(responseText || "null"), setCookie };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

async function brevo(path) {
  const response = await fetch(`https://api.brevo.com/v3${path}`, {
    headers: { "api-key": brevoKey, accept: "application/json" }, signal: AbortSignal.timeout(15_000),
  });
  ensure(response.ok, `Brevo delivery lookup failed (${response.status})`);
  return response.json();
}

async function waitForEmail(address, after, subjectPattern, { contentPattern } = {}) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const list = await brevo(`/smtp/emails?email=${encodeURIComponent(address)}&limit=20`);
    for (const item of list.transactionalEmails ?? []) {
      if (new Date(item.date).getTime() < after - 30_000 || !subjectPattern.test(item.subject)) continue;
      const detail = await brevo(`/smtp/emails/${encodeURIComponent(item.uuid)}`);
      const events = detail.events ?? [];
      const delivered = events.some((entry) => /deliver/i.test(entry.event ?? entry.type ?? ""));
      if (!delivered) continue;
      if (contentPattern && !contentPattern.test(`${detail.subject ?? ""}\n${detail.body ?? ""}`)) continue;
      return detail;
    }
    await new Promise((resolve) => setTimeout(resolve, pollDelayMs));
  }
  throw new Error(`Timed out waiting for ${subjectPattern} delivery`);
}

function data(response, status, step) {
  ensure(response.status === status, `${step} failed (HTTP ${response.status}, ${response.data?.error?.code ?? "unknown"})`);
  return response.data?.data ?? response.data;
}

function mondayWeeksAhead(weeks) {
  const today = new Date();
  const monday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7) + weeks * 7);
  return monday.toISOString().slice(0, 10);
}

async function main() {
  data(await request("/api/v1/ready"), 200, "Database readiness");
  console.log("✓ Site and database ready");

  const loginStarted = Date.now();
  data(await request("/api/v1/auth/request", { method: "POST", body: { email: instructorEmail } }), 202, "Sign-in email request");
  const signInEmail = await waitForEmail(instructorEmail, loginStarted, /^\d{6} is your MyDriveLog sign-in code$/);
  const code = signInEmail.subject.match(/^(\d{6})/)?.[1];
  ensure(code, "Delivered sign-in email did not contain a code");
  const { customToken } = data(await request("/api/v1/auth/verify", { method: "POST", body: { email: instructorEmail, code } }), 200, "Sign-in code verification");
  const firebaseResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(firebaseKey)}`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }), signal: AbortSignal.timeout(20_000),
  });
  ensure(firebaseResponse.ok, `Firebase sign-in failed (${firebaseResponse.status})`);
  const { idToken } = await firebaseResponse.json();
  const session = await request("/api/v1/auth/session", { method: "POST", body: { idToken } });
  data(session, 200, "Workspace session");
  const cookie = session.setCookie?.split(";")[0];
  ensure(cookie, "Workspace session cookie missing");
  if (session.data?.next === "/onboarding") data(await request("/api/v1/auth/onboarding", { method: "POST", body: { firstName: "Monitor" }, cookie }), 200, "Test instructor onboarding");
  console.log("✓ Sign-in code delivered; instructor session established");

  const collections = data(await request("/api/v1/collections", { cookie }), 200, "Test workspace read");
  const occupiedWeeks = new Set(collections.collections.map((item) => item.weekStart));
  let weekStart;
  for (let weeks = 3; weeks < 160; weeks++) {
    const candidate = mondayWeeksAhead(weeks);
    if (!occupiedWeeks.has(candidate)) { weekStart = candidate; break; }
  }
  ensure(weekStart, "No unused test week is available");
  const week = data(await request("/api/v1/collections", { method: "POST", body: { weekStart }, cookie }), 201, "Test week creation");
  const startsAt = new Date(`${weekStart}T12:00:00.000Z`);
  startsAt.setUTCDate(startsAt.getUTCDate() + 1);
  const endsAt = new Date(startsAt.getTime() + 60 * 60_000);
  const slot = data(await request(`/api/v1/collections/${week.id}/slots`, {
    method: "POST", cookie, body: { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), makeAvailable: true },
  }), 201, "Test lesson time creation");
  const invitationStarted = Date.now();
  const invitation = data(await request(`/api/v1/collections/${week.id}/share`, {
    method: "POST", cookie, body: { kind: "invite", name: "Monitoring Learner", email: learnerEmail },
  }), 201, "Test invitation");
  ensure(invitation.emailStatus === "sent", "Invitation was not accepted by the email provider");
  const invitationEmail = await waitForEmail(learnerEmail, invitationStarted, /lesson|booking|invitation/i, { contentPattern: /book\/availability\//i });
  const token = new URL(invitation.url).pathname.split("/").at(-1);
  ensure(invitationEmail.body.includes(token), "Delivered invitation did not contain its booking link");
  const publicCollection = data(await request(`/api/public/collections/${token}`), 200, "Public booking page");
  ensure(publicCollection.slots.some((item) => item.id === slot.id), "Test slot was not offered to the learner");
  console.log("✓ Test invitation delivered and booking slot visible");

  const bookingStarted = Date.now();
  const booking = data(await request(`/api/public/collections/${token}`, {
    method: "POST", body: { action: "claim", slotId: slot.id },
  }), 201, "Test booking");
  ensure(booking.confirmationEmailStatus === "sent", "Booking email was not accepted by the email provider");
  await waitForEmail(learnerEmail, bookingStarted, /book|lesson|confirm/i);
  await waitForEmail(instructorEmail, bookingStarted, /Lesson booked by/i);
  console.log("✓ Booking confirmed; learner and instructor emails delivered");

  const cleanup = data(await request("/api/v1/monitoring/cleanup", {
    method: "POST", cookie, body: { collectionId: week.id, bookingId: booking.id },
  }), 200, "Test record cleanup");
  ensure(cleanup.deleted === true, "Test records were not cleaned up");
  console.log("✓ Isolated test records removed");

  if (process.env.MONITORING_TELEGRAM_BOT_TOKEN && process.env.MONITORING_TELEGRAM_CHAT_ID) {
    const response = await fetch(`https://api.telegram.org/bot${process.env.MONITORING_TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: process.env.MONITORING_TELEGRAM_CHAT_ID,
        text: `✅ MyDriveLog [${process.env.MONITORING_ENVIRONMENT ?? "staging"}] [TEST]\nDeployment journey passed: sign-in, invitation, booking, email delivery, cleanup.` }),
      signal: AbortSignal.timeout(10_000),
    });
    ensure(response.ok, `Telegram test alert failed (${response.status})`);
    console.log("✓ Telegram test alert delivered");
  } else {
    throw new Error("Telegram credentials are required to verify alert delivery");
  }
}

main().catch((error) => {
  console.error(`Launch journey failed: ${error.message}`);
  process.exitCode = 1;
});
