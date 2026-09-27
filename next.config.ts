import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

// Fail shared Vercel builds that would otherwise ship a Google button with no Firebase config.
// NEXT_PUBLIC_* values are inlined at build time, so a missing one cannot be fixed without a rebuild. Local builds are unaffected.
const vercelEnv = process.env.VERCEL_ENV;
if (vercelEnv === "production" || vercelEnv === "preview") {
  const missing = ["NEXT_PUBLIC_FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "NEXT_PUBLIC_FIREBASE_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_APP_ID"].filter((key) => !process.env[key]?.trim());
  if (missing.length) throw new Error(`Firebase sign-in is not configured for this ${vercelEnv} build. Set ${missing.join(", ")} in the Vercel ${vercelEnv} environment and redeploy.`);
}

const nextConfig: NextConfig = {
  transpilePackages: ["@drivetrack/ui"],
};

// Sentry: the release is the short commit, matching the runtime SDKs and /api/v1/health.
// Source maps upload only when the Sentry integration provides SENTRY_AUTH_TOKEN, SENTRY_ORG and SENTRY_PROJECT.
const sentryUpload = Boolean(process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT);
const release = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12);

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !sentryUpload,
  telemetry: false,
  release: release ? { name: release, create: sentryUpload } : undefined,
  sourcemaps: { disable: !sentryUpload, deleteSourcemapsAfterUpload: true },
  webpack: { treeshake: { removeDebugLogging: true } },
});
