import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { InstructorOnboarding } from "@/components/instructor-onboarding";
import { currentSessionResolver } from "@/infrastructure/auth/current-session-resolver";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Set up your workspace — MyDriveLog" };

export default async function OnboardingPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(process.env.SESSION_COOKIE_NAME ?? "drivetrack_session")?.value;
  const session = await currentSessionResolver.resolve(token ?? null);
  if (!session) redirect("/sign-in");
  return <main data-dt="access-page"><InstructorOnboarding /></main>;
}
