"use client";

import { useEffect, useState } from "react";
import { EmptyState, PublicBookingPicker, toast, type PublicBooking } from "@drivetrack/ui";
import { ApiError, errorMessage, requestJson, toastError } from "./api-request";

export function PublicBookingWorkspace({ token }: { token: string }) {
  const [booking, setBooking] = useState<PublicBooking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const url = `/api/public/book/${token}`;
  useEffect(() => {
    let active = true;
    requestJson<{ data: PublicBooking }>(`/api/public/book/${token}`)
      .then(({ data }) => { if (active) setBooking(data); })
      .catch(() => { if (active) setError("This booking link is unavailable or has expired."); });
    return () => { active = false; };
  }, [token]);
  async function refresh() {
    try { setBooking((await requestJson<{ data: PublicBooking }>(url)).data); } catch { /* The confirmed or failed state is already on screen. */ }
  }
  async function book(startsAt: string) {
    try {
      const result = await requestJson<{ data: { confirmationEmailStatus: string } }>(url, { method: "POST", body: { startsAt } });
      toast.success("Lesson booked");
      await refresh();
      return { error: null, confirmationEmailStatus: result.data.confirmationEmailStatus };
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) await refresh();
      toastError("We couldn’t book this lesson", cause);
      return { error: errorMessage(cause) };
    }
  }
  if (error) return <div data-dt="public-booking-wrap"><EmptyState title="Booking unavailable" description={error} /></div>;
  if (!booking) return <div data-dt="public-booking-wrap"><p>Loading available times…</p></div>;
  return <div data-dt="public-booking-wrap"><PublicBookingPicker booking={booking} onBook={book} /></div>;
}
