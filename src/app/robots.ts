import type { MetadataRoute } from "next";
import { monitoringEnvironment } from "@/infrastructure/monitoring/environment";
import { PRIVATE_PATHS, PUBLIC_PAGES, SITE_URL } from "./site-pages";

// Read at request time so the answer always matches the environment the deployment runs in;
// only production may be crawled.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  if (monitoringEnvironment() !== "production") return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: [...PUBLIC_PAGES], disallow: [...PRIVATE_PATHS] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
