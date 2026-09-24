import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { ProductShell } from "@drivetrack/ui";
import { AvailabilityWorkspace } from "@/components/availability-workspace";
import { postgresSessionResolver } from "@/infrastructure/auth/postgres-session-resolver";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Calendar — DriveTrack" };

export default async function CalendarPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(process.env.SESSION_COOKIE_NAME ?? "drivetrack_session")?.value;
  if (!token) redirect("/sign-in");
  const session = await postgresSessionResolver.resolve(token);
  if (!session) redirect("/sign-in");
  if (session.workspaceStatus === "suspended") redirect("/sign-in");
  const renderedAt = new Date();

  return (
    <ProductShell
      brand="DriveTrack"
      navigation={[{ href: "/calendar", label: "Calendar", icon: <CalendarDays size={17} />, active: true }]}
      title="Your calendar"
      description="Plan your teaching week and create lesson slots."
      identity="Independent instructor workspace"
    >
      <AvailabilityWorkspace
        trialEndsAt={session.trialEndsAt?.toISOString() ?? null}
        paidThrough={session.paidThrough?.toISOString() ?? null}
        renderedAt={renderedAt.toISOString()}
        initialDate={renderedAt.toLocaleDateString("sv-SE", { timeZone: "Europe/London" })}
      />
    </ProductShell>
  );
}
