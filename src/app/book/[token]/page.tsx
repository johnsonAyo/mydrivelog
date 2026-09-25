import type { Metadata } from "next";
import { PublicBookingWorkspace } from "@/components/public-booking-workspace";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Book a lesson — MyDriveLog" };

export default async function BookingPage({ params }: PageProps<"/book/[token]">) {
  const { token } = await params;
  return <PublicBookingWorkspace token={token} />;
}
