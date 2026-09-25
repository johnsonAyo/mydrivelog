import type { Metadata } from "next";
import { EmailAccessForm } from "@drivetrack/ui";

export const metadata: Metadata = { title: "Start your pilot — MyDriveLog" };

export default function GetStartedPage() {
  return <main data-dt="access-page"><EmailAccessForm /></main>;
}
