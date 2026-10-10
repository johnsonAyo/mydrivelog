import { afterEach, describe, expect, it, vi } from "vitest";
import robots from "./robots";
import sitemap from "./sitemap";

afterEach(() => vi.unstubAllEnvs());

describe("robots.txt", () => {
  it("lets crawlers reach the public pages in production and keeps them out of the app", () => {
    vi.stubEnv("MONITORING_ENVIRONMENT", "production");
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rules.allow).toEqual(["/", "/get-started", "/sign-in", "/privacy"]);
    for (const path of ["/api/", "/book/", "/calendar", "/today", "/learners", "/lessons", "/settings", "/onboarding", "/component-lab"]) {
      expect(rules.disallow).toContain(path);
    }
    expect(result.sitemap).toBe("https://www.mydrivelog.co.uk/sitemap.xml");
  });

  it.each(["staging", "development"])("blocks every path on %s", (environment) => {
    vi.stubEnv("MONITORING_ENVIRONMENT", environment);
    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  });
});

describe("sitemap.xml", () => {
  it("lists only the public pages on the production domain", () => {
    expect(sitemap().map((entry) => entry.url)).toEqual([
      "https://www.mydrivelog.co.uk",
      "https://www.mydrivelog.co.uk/get-started",
      "https://www.mydrivelog.co.uk/sign-in",
      "https://www.mydrivelog.co.uk/privacy",
    ]);
  });
});
