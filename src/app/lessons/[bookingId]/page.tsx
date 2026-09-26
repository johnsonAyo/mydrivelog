import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { CalendarDays, ListChecks, SlidersHorizontal, UsersRound } from "lucide-react";
import { ProductShell } from "@drivetrack/ui";
import { canWriteWorkspace } from "@/application/auth/can-write-workspace";
import { LessonWorkspace } from "@/components/lesson-workspace";
import { InstructorSignOut } from "@/components/instructor-sign-out";
import { currentSessionResolver } from "@/infrastructure/auth/current-session-resolver";
import { postgresLessonRepository } from "@/infrastructure/lessons/postgres-lesson-repository";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Lesson — MyDriveLog" };

export default async function LessonPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  if (!z.uuid().safeParse(bookingId).success) notFound();
  const cookieStore = await cookies();
  const token = cookieStore.get(process.env.SESSION_COOKIE_NAME ?? "drivetrack_session")?.value;
  const session = await currentSessionResolver.resolve(token ?? null);
  if (!session || session.workspaceStatus === "suspended") redirect("/sign-in");
  if (!await postgresLessonRepository.find(session.workspaceId, bookingId)) notFound();
  return <ProductShell brand="MyDriveLog"
    navigation={[{ href: "/today", label: "Today", icon: <ListChecks size={17} /> }, { href: "/calendar", label: "Calendar", icon: <CalendarDays size={17} /> }, { href: "/learners", label: "Learners", icon: <UsersRound size={17} /> }, { href: "/settings/scheduling", label: "Scheduling", icon: <SlidersHorizontal size={17} /> }]}
    title="Lesson debrief" description="Prepare, record, complete, and share on your terms."
    identity="Independent instructor workspace" actions={<InstructorSignOut />}>
    <LessonWorkspace bookingId={bookingId} writable={canWriteWorkspace(session)} />
  </ProductShell>;
}
