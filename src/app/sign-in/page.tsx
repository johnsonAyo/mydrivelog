import type { Metadata } from "next";
import { EmailAccessForm } from "@drivetrack/ui";

export const metadata: Metadata = { title: "Sign in — MyDriveLog" };

export default function SignInPage() {
  return <main data-dt="access-page"><EmailAccessForm mode="sign-in" /></main>;
}
