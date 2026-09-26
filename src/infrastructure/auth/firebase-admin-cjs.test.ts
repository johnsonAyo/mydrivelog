import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

// Vercel's function runtime loads external packages through its own CommonJS loader, which cannot
// require() ES modules even on Node 24. firebase-admin is external in Next builds, so every module it
// loads at import time must be plain CommonJS. This mirrors that loader by disabling require(esm).
describe("firebase-admin on a CommonJS-only runtime", () => {
  it("loads the auth module without requiring an ES module", () => {
    const result = spawnSync(process.execPath, ["--no-experimental-require-module", "-e", "require('firebase-admin/app'); require('firebase-admin/auth');"], { encoding: "utf8" });
    expect(result.stderr).not.toContain("ERR_REQUIRE_ESM");
    expect(result.status).toBe(0);
  });
});
