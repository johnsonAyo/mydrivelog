"use client";

import { useEffect, useState } from "react";
import { EmptyState, PublicCollectionPicker, type PublicCollection } from "@drivetrack/ui";

export function PublicCollectionWorkspace({ token }: { token: string }) {
  const [collection, setCollection] = useState<PublicCollection | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const response = await fetch(`/api/public/collections/${token}`, { cache: "no-store" });
    if (!response.ok) throw new Error("This availability link is unavailable.");
    const json: { data: PublicCollection } = await response.json();
    setCollection(json.data);
  }
  useEffect(() => {
    let active = true;
    fetch(`/api/public/collections/${token}`, { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("This availability link is unavailable.");
      const json: { data: PublicCollection } = await response.json();
      if (active) setCollection(json.data);
    }).catch((cause) => { if (active) setLoadingError(cause instanceof Error ? cause.message : "Could not load lesson times."); });
    return () => { active = false; };
  }, [token]);

  async function act(body: unknown, success: string) {
    setBusy(true); setError(null); setNotice(null);
    try {
      const response = await fetch(`/api/public/collections/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) {
        const json: { detail?: string } = await response.json().catch(() => ({}));
        if (response.status === 409) await refresh();
        throw new Error(json.detail ?? "Could not complete this request.");
      }
      await refresh();
      setNotice(success);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not complete this request."); } finally { setBusy(false); }
  }

  if (loadingError) return <div data-dt="public-booking-wrap"><EmptyState title="Booking unavailable" description={loadingError} /></div>;
  if (!collection) return <div data-dt="public-booking-wrap"><p>Loading lesson times…</p></div>;
  return <PublicCollectionPicker collection={collection} onRequestAccess={(name, email) => act({ action: "request_access", name, email }, "Check your email for your personal booking link.")} onBook={(slotId) => act({ action: "claim", slotId }, "Your lesson is booked. A confirmation email has been sent if email delivery is connected.")} busy={busy} error={error} notice={notice} />;
}
