import type { Metadata } from "next";
import { InstructorAccess } from "@/components/instructor-access";

export const metadata: Metadata = { title: "Start your pilot — MyDriveLog" };

export default function GetStartedPage() {
  return <main data-dt="access-page"><InstructorAccess mode="start" /></main>;
}
