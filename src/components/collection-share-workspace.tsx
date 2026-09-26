"use client";

import { useState } from "react";
import Link from "next/link";
import { CollectionSharing, toast, type CollectionDetail, type ContactOption } from "@drivetrack/ui";
import { errorMessage, requestJson, toastError } from "./api-request";

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
      const result = await requestJson<{ data: { url: string; emailStatus?: string } }>(`${base}/share`, { method: "POST", body });
      if (body.kind === "invite") {
        const sent = result.data.emailStatus === "sent";
        setLastInvitation({ url: result.data.url, emailStatus: result.data.emailStatus ?? "pending" });
        setNotice(sent ? "Invitation sent." : "Invitation created. Please check email delivery and send the link manually if needed.");
        if (sent) toast.success(`Invitation sent to ${body.name}`);
        else toast.error({ title: "Invitation created, but the email didn’t send", description: "Copy the personal link below and send it yourself." });
      } else {
        setGeneralUrl(result.data.url);
        setNotice("General link ready to copy.");
      }
      await requestJson<{ data: CollectionDetail }>(base).then(({ data }) => setCollection(data), () => {});
    } catch (cause) {
      setError(errorMessage(cause));
      toastError(body.kind === "invite" ? "We couldn’t send this invitation" : "We couldn’t create a general link", cause);
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
