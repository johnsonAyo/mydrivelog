import type { Metadata } from "next";
import { InstructorAccess } from "@/components/instructor-access";

export const metadata: Metadata = { title: "Sign in — MyDriveLog" };

export default function SignInPage() {
  return <main data-dt="access-page"><InstructorAccess mode="sign-in" /></main>;
}
