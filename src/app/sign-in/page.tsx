import type { Metadata } from "next";

import { InstructorAccess } from "@/components/instructor-access";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Sign in — MyDriveLog" };

export default function SignInPage() {
  return <main data-dt="access-page">
    <SiteHeader mode="standalone" />
    <div data-dt="access-main"><InstructorAccess mode="sign-in" /></div>
    <SiteFooter mode="standalone" />
  </main>;
}
