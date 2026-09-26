"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState, PublicCollectionPicker, toast, type PublicCollection } from "@drivetrack/ui";
import { ApiError, errorMessage, requestJson, toastError } from "./api-request";

type Outcome = { success: string; notice: string; failure: string };

const outcomes = {
  request_access: { success: "Check your email", notice: "Check your email for your personal booking link.", failure: "We couldn’t send your booking link" },
  claim: { success: "Lesson booked", notice: "Your lesson is booked.", failure: "We couldn’t book this lesson" },
  cancel: { success: "Lesson cancelled", notice: "Lesson cancelled. The change is reflected in your instructor’s calendar.", failure: "We couldn’t cancel this lesson" },
  reschedule: { success: "Lesson moved", notice: "Lesson moved. The new time is reflected in your instructor’s calendar.", failure: "We couldn’t move this lesson" },
} satisfies Record<string, Outcome>;

type ActionResult = { data?: { confirmationEmailStatus?: string; emailStatus?: { learner: string; instructor: string } } };

export function PublicCollectionWorkspace({ token }: { token: string }) {
  const [collection, setCollection] = useState<PublicCollection | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const url = `/api/public/collections/${token}`;

  async function refresh() {
    setCollection((await requestJson<{ data: PublicCollection }>(url)).data);
  }
  useEffect(() => {
    let active = true;
    requestJson<{ data: PublicCollection }>(`/api/public/collections/${token}`)
      .then(({ data }) => { if (active) setCollection(data); })
      .catch(() => { if (active) setLoadingError("This availability link is unavailable."); });
    return () => { active = false; };
  }, [token]);

  async function act(body: { action: keyof typeof outcomes } & Record<string, unknown>) {
    const outcome = outcomes[body.action];
    setBusy(true); setError(null); setNotice(null);
    try {
      const result = await requestJson<ActionResult>(url, { method: "POST", body });
      const delivery = result.data?.emailStatus;
      const emailUnavailable = delivery && (delivery.learner !== "sent" || delivery.instructor !== "sent");
      const message = result.data?.confirmationEmailStatus
        ? `${outcome.notice} ${result.data.confirmationEmailStatus === "sent" ? "A confirmation email has been sent." : "Email confirmation is unavailable; keep this link for your booking details."}`
        : emailUnavailable ? `${outcome.notice} Email was not delivered to everyone; please contact your instructor directly.` : outcome.notice;
      toast.success(outcome.success);
      try {
        await refresh();
        setNotice(message);
      } catch {
        setNotice(`${message} Refresh the page to see the latest times.`);
      }
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) await refresh().catch(() => {});
      setError(errorMessage(cause));
      toastError(outcome.failure, cause);
    } finally { setBusy(false); }
  }

  if (loadingError) return <div data-dt="public-booking-wrap"><EmptyState title="Booking unavailable" description={loadingError} /></div>;
  if (!collection) return <div data-dt="public-booking-wrap"><p>Loading lesson times…</p></div>;
  return <PublicCollectionPicker collection={collection} renderHomeLink={(children) => <Link href="/">{children}</Link>}
    onRequestAccess={(name, email) => act({ action: "request_access", name, email })}
    onBook={(slotId) => act({ action: "claim", slotId })}
    onChangeBooking={(bookingId, action, slotId) => act({ action, collectionId: collection.collectionId, bookingId, slotId })}
    busy={busy} error={error} notice={notice} />;
}
