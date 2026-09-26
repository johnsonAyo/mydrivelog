import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ProductPage } from "@drivetrack/ui";
import { CollectionBookingPreview } from "@/components/collection-booking-preview";
import { currentSessionResolver } from "@/infrastructure/auth/current-session-resolver";
import { getCollectionPreview } from "@/infrastructure/collections/postgres-collection-repository";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Booking page preview — MyDriveLog" };

export default async function BookingPreviewPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const cookieStore = await cookies();
  const token = cookieStore.get(process.env.SESSION_COOKIE_NAME ?? "drivetrack_session")?.value;
  const session = await currentSessionResolver.resolve(token ?? null);
  if (!session || session.workspaceStatus === "suspended") redirect("/sign-in");
  const kind = (await searchParams).kind === "general" ? "general" : "invitation";
  const preview = await getCollectionPreview(session.workspaceId, id, kind);
  if (!preview) notFound();

  return <ProductPage
    title="Booking page preview" description="See the available times from the learner’s side. No booking can be made here."
  >
    <nav data-dt="collection-preview-nav" aria-label="Booking preview options">
      <Link href="/calendar">← Back to calendar</Link>
      <Link href={`/calendar/${id}/preview`} aria-current={kind === "invitation" ? "page" : undefined}>Personal invitation</Link>
      <Link href={`/calendar/${id}/preview?kind=general`} aria-current={kind === "general" ? "page" : undefined}>General link</Link>
    </nav>
    <CollectionBookingPreview collection={preview} />
  </ProductPage>;
}
