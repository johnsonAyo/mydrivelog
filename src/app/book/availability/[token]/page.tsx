import { PublicCollectionWorkspace } from "@/components/public-collection-workspace";

export default async function CollectionBookingPage({ params }: PageProps<"/book/availability/[token]">) {
  const { token } = await params;
  return <PublicCollectionWorkspace token={token} />;
}
