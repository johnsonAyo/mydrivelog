import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProductPage } from "@drivetrack/ui";
import { AvailabilityWorkspace } from "@/components/availability-workspace";
import { currentSessionResolver } from "@/infrastructure/auth/current-session-resolver";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Calendar — MyDriveLog" };

export default async function CalendarPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(process.env.SESSION_COOKIE_NAME ?? "drivetrack_session")?.value;
  const session = await currentSessionResolver.resolve(token ?? null);
  if (!session) redirect("/sign-in");
  if (session.workspaceStatus === "suspended") redirect("/sign-in");
  const renderedAt = new Date();

  return (
    <ProductPage
      title="Calendar"
      description="Create availability, share booking links, and see confirmed lessons."
    >
      <AvailabilityWorkspace
        testingWorkspace={session.testingWorkspace === true}
        pilotActive={session.pilotActive}
        trialEndsAt={session.trialEndsAt?.toISOString() ?? null}
        paidThrough={session.paidThrough?.toISOString() ?? null}
        renderedAt={renderedAt.toISOString()}
        initialDate={renderedAt.toLocaleDateString("sv-SE", { timeZone: "Europe/London" })}
      />
    </ProductPage>
  );
}
