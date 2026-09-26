import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CalendarDays, ListChecks, SlidersHorizontal, UsersRound } from "lucide-react";
import { ProductShell, TodayTimeline } from "@drivetrack/ui";
import { InstructorSignOut } from "@/components/instructor-sign-out";
import { currentSessionResolver } from "@/infrastructure/auth/current-session-resolver";
import { listInstructorLessons } from "@/infrastructure/lessons/list-instructor-lessons";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Today — MyDriveLog" };

export default async function TodayPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(process.env.SESSION_COOKIE_NAME ?? "drivetrack_session")?.value;
  const session = await currentSessionResolver.resolve(token ?? null);
  if (!session || session.workspaceStatus === "suspended") redirect("/sign-in");
  const lessons = await listInstructorLessons(session.workspaceId, new Date());
  return <ProductShell brand="MyDriveLog"
    navigation={[{ href: "/today", label: "Today", icon: <ListChecks size={17} />, active: true }, { href: "/calendar", label: "Calendar", icon: <CalendarDays size={17} /> }, { href: "/learners", label: "Learners", icon: <UsersRound size={17} /> }, { href: "/settings/scheduling", label: "Scheduling", icon: <SlidersHorizontal size={17} /> }]}
    title="Today" description="Today’s booked lessons and debriefs still waiting for you."
    identity="Independent instructor workspace" actions={<InstructorSignOut />}>
    {lessons.length ? <TodayTimeline lessons={lessons} /> : <p>You have no booked lessons or debriefs waiting today.</p>}
  </ProductShell>;
}
