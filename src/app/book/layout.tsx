import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const title = "Book a driving lesson | MyDriveLog";
const description = "See the times your instructor has shared and choose a driving lesson that works for you.";

export const metadata: Metadata = {
  title,
  description,
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: "MyDriveLog",
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/book/opengraph-image"],
  },
};

export default function BookingLayout({ children }: LayoutProps<"/book">) {
  return <div data-dt="book-site">
    <SiteHeader mode="standalone" />
    <div data-dt="book-site-content">{children}</div>
    <SiteFooter mode="standalone" />
  </div>;
}
