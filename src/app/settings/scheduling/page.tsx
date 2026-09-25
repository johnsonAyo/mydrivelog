import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CalendarDays, SlidersHorizontal } from "lucide-react";
import { ProductShell } from "@drivetrack/ui";
import { SchedulingSettingsWorkspace } from "@/components/scheduling-settings-workspace";
import { currentSessionResolver } from "@/infrastructure/auth/current-session-resolver";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Scheduling settings — MyDriveLog" };

export default async function SchedulingPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(process.env.SESSION_COOKIE_NAME ?? "drivetrack_session")?.value;
  const session = await currentSessionResolver.resolve(token ?? null);
  if (!session || session.workspaceStatus === "suspended") redirect("/sign-in");
  return <ProductShell brand="MyDriveLog" title="Scheduling settings" description="Set the rules for new availability and online lesson bookings." identity="Independent instructor workspace" navigation={[
    { href: "/calendar", label: "Calendar", icon: <CalendarDays size={17} /> },
    { href: "/settings/scheduling", label: "Scheduling", icon: <SlidersHorizontal size={17} />, active: true },
  ]}><SchedulingSettingsWorkspace /></ProductShell>;
}
