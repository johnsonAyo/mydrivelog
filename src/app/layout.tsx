import type { Metadata } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "./globals.css";

export const metadata: Metadata = {
  title: "DriveTrack — Keep every lesson on track",
  description:
    "Plan your week, release lesson slots, manage bookings, and complete debriefs from one focused workspace for independent driving instructors.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
