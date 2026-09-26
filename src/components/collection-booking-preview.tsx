"use client";

import { PublicCollectionPicker, type PublicCollection } from "@drivetrack/ui";

export function CollectionBookingPreview({ collection }: { collection: PublicCollection }) {
  return <PublicCollectionPicker collection={collection} onRequestAccess={async () => {}} onBook={async () => {}} busy={false} error={null} notice={null} preview />;
}
