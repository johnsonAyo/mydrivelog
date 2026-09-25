"use client";

import { useEffect, useState } from "react";
import { EmptyState, PublicBookingPicker, type PublicBooking } from "@drivetrack/ui";

export function PublicBookingWorkspace({ token }: { token: string }) {
  const [booking, setBooking] = useState<PublicBooking | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    fetch(`/api/public/book/${token}`, { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("This booking link is unavailable or has expired.");
      const json: { data: PublicBooking } = await response.json();
      if (active) setBooking(json.data);
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not open this booking link."); });
    return () => { active = false; };
  }, [token]);
  async function book(startsAt: string) {
    const response = await fetch(`/api/public/book/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ startsAt }) });
    if (!response.ok) {
      const body: { detail?: string } = await response.json().catch(() => ({}));
      if (response.status === 409) {
        const refresh = await fetch(`/api/public/book/${token}`, { cache: "no-store" });
        if (refresh.ok) { const json: { data: PublicBooking } = await refresh.json(); setBooking(json.data); }
      }
      return { error: body.detail ?? "That time is no longer available. Choose another." };
    }
    const result: { data: { confirmationEmailStatus: string } } = await response.json();
    const refresh = await fetch(`/api/public/book/${token}`, { cache: "no-store" });
    if (refresh.ok) { const json: { data: PublicBooking } = await refresh.json(); setBooking(json.data); }
    return { error: null, confirmationEmailStatus: result.data.confirmationEmailStatus };
  }
  if (error) return <div data-dt="public-booking-wrap"><EmptyState title="Booking unavailable" description={error} /></div>;
  if (!booking) return <div data-dt="public-booking-wrap"><p>Loading available times…</p></div>;
  return <div data-dt="public-booking-wrap"><PublicBookingPicker booking={booking} onBook={book} /></div>;
}
