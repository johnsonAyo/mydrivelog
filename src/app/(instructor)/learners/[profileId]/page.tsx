import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { LearnerProfile, ProductPage } from "@drivetrack/ui";
import { currentSessionResolver } from "@/infrastructure/auth/current-session-resolver";
import { getLearnerProfile } from "@/infrastructure/learners/postgres-learner-repository";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Learner record — MyDriveLog" };

export default async function LearnerProfilePage({ params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params;
  if (!/^[a-f0-9]{64}$/.test(profileId)) notFound();
  const cookieStore = await cookies();
  const token = cookieStore.get(process.env.SESSION_COOKIE_NAME ?? "drivetrack_session")?.value;
  const session = await currentSessionResolver.resolve(token ?? null);
  if (!session || session.workspaceStatus === "suspended") redirect("/sign-in");
  const profile = await getLearnerProfile(session.workspaceId, profileId);
  if (!profile) notFound();
  return <ProductPage title="Learner record" description="Pick up where you left off with this learner.">
    <LearnerProfile name={profile.learner.name} email={profile.learner.email} lessons={profile.lessons}
      renderBackLink={(href, children) => <Link href={href}>{children}</Link>}
      renderLessonLink={(href, children) => <Link href={href}>{children}</Link>} />
  </ProductPage>;
}
