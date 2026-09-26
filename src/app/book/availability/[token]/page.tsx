import type { Metadata } from "next";
import { PublicCollectionWorkspace } from "@/components/public-collection-workspace";

export const metadata: Metadata = { title: "Book a driving lesson — MyDriveLog" };

export default async function CollectionBookingPage({ params }: PageProps<"/book/availability/[token]">) {
  const { token } = await params;
  return <PublicCollectionWorkspace token={token} />;
}
