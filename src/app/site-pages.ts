export const SITE_URL = "https://www.mydrivelog.co.uk";

/** Public marketing pages that search engines may crawl and list. */
export const PUBLIC_PAGES = ["/", "/get-started", "/sign-in", "/privacy"] as const;

/** Signed-in app, API, personal booking-token and internal pages that crawlers must skip. */
export const PRIVATE_PATHS = [
  "/api/",
  "/book/",
  "/calendar",
  "/today",
  "/learners",
  "/lessons",
  "/settings",
  "/onboarding",
  "/component-lab",
] as const;
