import type { Metadata } from "next";
import "@fontsource-variable/bricolage-grotesque";
import { Toaster } from "@drivetrack/ui";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.mydrivelog.co.uk"),
  title: "MyDriveLog | Keep every lesson on track",
  description: "Plan lessons, share availability, manage bookings, and keep every learner’s progress in one focused workspace for driving instructors.",
  applicationName: "MyDriveLog",
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: "MyDriveLog",
    url: "/",
    title: "MyDriveLog | Keep every lesson on track",
    description: "Plan lessons, share availability, manage bookings, and keep every learner’s progress in one focused workspace for driving instructors.",
  },
  twitter: {
    card: "summary_large_image",
    title: "MyDriveLog | Keep every lesson on track",
    description: "Plan lessons, share availability, manage bookings, and keep every learner’s progress in one focused workspace for driving instructors.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}<Toaster /></body>
    </html>
  );
}
