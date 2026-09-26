import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ProductPage } from "@drivetrack/ui";
import { canWriteWorkspace } from "@/application/auth/can-write-workspace";
import { LessonWorkspace } from "@/components/lesson-workspace";
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
  if (!session || session.workspaceStatus === "suspended") redirect("/");
  if (!await postgresLessonRepository.find(session.workspaceId, bookingId)) notFound();
  return <ProductPage
    title="Lesson debrief" description="Prepare, record, complete, and share on your terms."
  >
    <LessonWorkspace bookingId={bookingId} writable={canWriteWorkspace(session)} />
  </ProductPage>;
}
