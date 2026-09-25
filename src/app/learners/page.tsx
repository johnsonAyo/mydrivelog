import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CalendarDays, SlidersHorizontal, UsersRound } from "lucide-react";
import { ProductShell } from "@drivetrack/ui";
import { LearnerDirectoryWorkspace } from "@/components/learner-directory-workspace";
import { currentSessionResolver } from "@/infrastructure/auth/current-session-resolver";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Learners — MyDriveLog" };

export default async function LearnersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(process.env.SESSION_COOKIE_NAME ?? "drivetrack_session")?.value;
  const session = await currentSessionResolver.resolve(token ?? null);
  if (!session || session.workspaceStatus === "suspended") redirect("/sign-in");
  return <ProductShell brand="MyDriveLog" title="Learners" description="Keep the people you teach in one place." identity="Independent instructor workspace" navigation={[
    { href: "/calendar", label: "Calendar", icon: <CalendarDays size={17} /> },
    { href: "/learners", label: "Learners", icon: <UsersRound size={17} />, active: true },
    { href: "/settings/scheduling", label: "Scheduling", icon: <SlidersHorizontal size={17} /> },
  ]}><LearnerDirectoryWorkspace /></ProductShell>;
}
