import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ProductPage } from "@drivetrack/ui";
import { canWriteWorkspace } from "@/application/auth/can-write-workspace";
import { CollectionShareWorkspace } from "@/components/collection-share-workspace";
import { currentSessionResolver } from "@/infrastructure/auth/current-session-resolver";
import { getCollection, listContacts } from "@/infrastructure/collections/postgres-collection-repository";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Share availability — MyDriveLog" };

export default async function ShareCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const cookieStore = await cookies();
  const token = cookieStore.get(process.env.SESSION_COOKIE_NAME ?? "drivetrack_session")?.value;
  const session = await currentSessionResolver.resolve(token ?? null);
  if (!session || session.workspaceStatus === "suspended") redirect("/sign-in");
  const [collection, contacts] = await Promise.all([getCollection(session.workspaceId, id), listContacts(session.workspaceId)]);
  if (!collection) notFound();

  return <ProductPage
    title="Share availability" description={`Invite people to book from ${collection.name}.`}
  >
    <CollectionShareWorkspace initialCollection={collection} contacts={contacts} writable={canWriteWorkspace(session)} />
  </ProductPage>;
}
