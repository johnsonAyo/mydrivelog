import type { NextConfig } from "next";

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

export default nextConfig;
