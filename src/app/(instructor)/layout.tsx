import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { instructorFirstName } from "@/application/auth/session-context";
import { InstructorSidebar } from "@/components/instructor-sidebar";
import { currentSessionResolver } from "@/infrastructure/auth/current-session-resolver";

export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(process.env.SESSION_COOKIE_NAME ?? "drivetrack_session")?.value;
  const session = await currentSessionResolver.resolve(token ?? null);
  if (!session || session.workspaceStatus === "suspended") redirect("/");

  return <div data-dt="product-shell">
    <InstructorSidebar instructorName={instructorFirstName(session.instructorName)} />
    <div data-dt="product-main">{children}</div>
  </div>;
}
