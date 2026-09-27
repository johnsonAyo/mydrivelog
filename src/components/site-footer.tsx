import Link from "next/link";

import { Wordmark } from "@/components/brand-mark";

const footerLinks = [
  { href: "#product", label: "Product" },
  { href: "#faq", label: "FAQ" },
  { href: "mailto:hello@mydrivelog.co.uk", label: "Contact" },
];

/**
 * `mode="standalone"` renders section links as absolute paths, for pages that
 * carry the site chrome outside the landing page (sign-in, get started).
 */
export function SiteFooter({ mode = "landing" }: { mode?: "landing" | "standalone" }) {
  return (
    <footer className="site-footer">
      <div className="shell footer-inner">
        <Link href={mode === "landing" ? "#top" : "/"} aria-label="MyDriveLog home">
          <Wordmark />
        </Link>
        <div>
          {footerLinks.map((link) => (
            <Link href={mode === "landing" || link.href.startsWith("mailto:") ? link.href : `/${link.href}`} key={link.label}>
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
