import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProductPage } from "@drivetrack/ui";
import { LearnerDirectoryWorkspace } from "@/components/learner-directory-workspace";
import { currentSessionResolver } from "@/infrastructure/auth/current-session-resolver";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Learners — MyDriveLog" };

export default async function LearnersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(process.env.SESSION_COOKIE_NAME ?? "drivetrack_session")?.value;
  const session = await currentSessionResolver.resolve(token ?? null);
  if (!session || session.workspaceStatus === "suspended") redirect("/");
  return <ProductPage title="Learners" description="Keep the people you teach in one place."><LearnerDirectoryWorkspace /></ProductPage>;
}
