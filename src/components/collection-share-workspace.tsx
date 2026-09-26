"use client";

import { useState } from "react";
import Link from "next/link";
import { CollectionSharing, type CollectionDetail, type ContactOption } from "@drivetrack/ui";
import { apiError } from "./api-error";

export function CollectionShareWorkspace({ initialCollection, contacts, writable }: {
  initialCollection: CollectionDetail; contacts: ContactOption[]; writable: boolean;
}) {
  const [collection, setCollection] = useState(initialCollection);
  const [generalUrl, setGeneralUrl] = useState<string | null>(null);
  const [lastInvitation, setLastInvitation] = useState<{ url: string; emailStatus: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const base = `/api/v1/collections/${collection.id}`;

  async function share(body: { kind: "invite"; name: string; email: string } | { kind: "general" }) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`${base}/share`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error(await apiError(response, "Could not share this list."));
      const result: { data: { url: string; emailStatus?: string } } = await response.json();
      if (body.kind === "invite") {
        setLastInvitation({ url: result.data.url, emailStatus: result.data.emailStatus ?? "pending" });
        setNotice(result.data.emailStatus === "sent" ? "Invitation sent." : "Invitation created. Please check email delivery and send the link manually if needed.");
      } else {
        setGeneralUrl(result.data.url);
        setNotice("General link ready to copy.");
      }
      const refreshed = await fetch(base, { cache: "no-store" });
      if (refreshed.ok) {
        const json: { data: CollectionDetail } = await refreshed.json();
        setCollection(json.data);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not share this list.");
    } finally {
      setBusy(false);
    }
  }

  return <div data-dt="collection-share-page">
    <Link href="/calendar">← Back to calendar</Link>
    <CollectionSharing collection={collection} contacts={contacts}
      onInvite={(name, email) => share({ kind: "invite", name, email })}
      onGeneralLink={() => share({ kind: "general" })}
      previewHref={`/calendar/${collection.id}/preview`}
      renderPreviewLink={(href, children) => <Link data-dt="collection-preview-link" href={href}>{children}</Link>}
      generalUrl={generalUrl} lastInvitation={lastInvitation}
      busy={busy || !writable} error={error} notice={notice} />
  </div>;
}
