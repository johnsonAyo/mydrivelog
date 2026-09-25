import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CalendarDays, SlidersHorizontal } from "lucide-react";
import { ProductShell } from "@drivetrack/ui";
import { AvailabilityWorkspace } from "@/components/availability-workspace";
import { currentSessionResolver } from "@/infrastructure/auth/current-session-resolver";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Calendar — DriveTrack" };

export default async function CalendarPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(process.env.SESSION_COOKIE_NAME ?? "drivetrack_session")?.value;
  const session = await currentSessionResolver.resolve(token ?? null);
  if (!session) redirect("/sign-in");
  if (session.workspaceStatus === "suspended") redirect("/sign-in");
  const renderedAt = new Date();

  return (
    <ProductShell
      brand="DriveTrack"
      navigation={[{ href: "/calendar", label: "Calendar", icon: <CalendarDays size={17} />, active: true }, { href: "/settings/scheduling", label: "Scheduling", icon: <SlidersHorizontal size={17} /> }]}
      title="Your calendar"
      description="Create availability, share booking links, and see confirmed lessons."
      identity="Independent instructor workspace"
    >
      <AvailabilityWorkspace
        testingWorkspace={session.testingWorkspace === true}
        trialEndsAt={session.trialEndsAt?.toISOString() ?? null}
        paidThrough={session.paidThrough?.toISOString() ?? null}
        renderedAt={renderedAt.toISOString()}
        initialDate={renderedAt.toLocaleDateString("sv-SE", { timeZone: "Europe/London" })}
      />
    </ProductShell>
  );
}
