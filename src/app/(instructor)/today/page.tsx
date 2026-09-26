import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProductPage, TodayTimeline } from "@drivetrack/ui";
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
  return <ProductPage
    title="Today" description="Today’s booked lessons and debriefs still waiting for you."
  >
    {lessons.length ? <TodayTimeline lessons={lessons} renderLessonLink={(href, children) => <Link href={href}>{children}</Link>} /> : <p>You have no booked lessons or debriefs waiting today.</p>}
  </ProductPage>;
}
