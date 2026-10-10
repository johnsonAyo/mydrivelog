import type { MetadataRoute } from "next";
import { PUBLIC_PAGES, SITE_URL } from "./site-pages";

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map((path) => ({ url: path === "/" ? SITE_URL : `${SITE_URL}${path}` }));
}
