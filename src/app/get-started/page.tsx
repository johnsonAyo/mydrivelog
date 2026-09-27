import type { Metadata } from "next";

import { InstructorAccess } from "@/components/instructor-access";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Start your pilot — MyDriveLog" };

export default function GetStartedPage() {
  return <main data-dt="access-page">
    <SiteHeader mode="standalone" />
    <div data-dt="access-main"><InstructorAccess mode="start" /></div>
    <SiteFooter mode="standalone" />
  </main>;
}
