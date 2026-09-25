"use client";

import { useMemo, useState } from "react";
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { AvailabilityCalendar, AvailabilityForm, AvailabilityWindowPanel, Button, EmptyState, Inline, Stack, TrialNotice, type CalendarSlot, type ReleasedLink, type SchedulingSettings, type WindowDetail } from "@drivetrack/ui";

type ApiSlot = { id: string; startsAt: string; endsAt: string; status: "open"; sessionMinutes: number; bufferMinutes: number };
type ApiBooking = { id: string; startsAt: string; endsAt: string; name: string; email: string };

async function apiError(response: Response, fallback: string) {
  const body: { detail?: string } = await response.json().catch(() => ({}));
  return body.detail ?? fallback;
}

function startOfWeek(date: Date) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

function displayTime(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(date);
}

export function AvailabilityWorkspace({ trialEndsAt, paidThrough, renderedAt, initialDate, testingWorkspace }: {
  trialEndsAt: string | null;
  paidThrough: string | null;
  renderedAt: string;
  initialDate: string;
  testingWorkspace: boolean;
}) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }));
  return <QueryClientProvider client={queryClient}><AvailabilityWorkspaceContent trialEndsAt={trialEndsAt} paidThrough={paidThrough} renderedAt={renderedAt} initialDate={initialDate} testingWorkspace={testingWorkspace} /></QueryClientProvider>;
}

function AvailabilityWorkspaceContent({ trialEndsAt, paidThrough, renderedAt, initialDate, testingWorkspace }: {
  trialEndsAt: string | null;
  paidThrough: string | null;
  renderedAt: string;
  initialDate: string;
  testingWorkspace: boolean;
}) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(`${initialDate}T12:00:00`)));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [links, setLinks] = useState<ReleasedLink[]>([]);
  const queryClient = useQueryClient();
  const active = testingWorkspace || (trialEndsAt !== null && new Date(trialEndsAt) > new Date(renderedAt)) ||
    (paidThrough !== null && new Date(paidThrough) > new Date(renderedAt));

  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 7);
    return end;
  }, [weekStart]);

  const availability = useQuery({
    queryKey: ["availability", weekStart.toISOString(), weekEnd.toISOString()],
    queryFn: async ({ signal }): Promise<ApiSlot[]> => {
      const query = new URLSearchParams({ from: weekStart.toISOString(), to: weekEnd.toISOString() });
      const response = await fetch(`/api/v1/availability?${query}`, { signal, cache: "no-store" });
      if (!response.ok) throw new Error("Could not load availability");
      const json: { data: ApiSlot[] } = await response.json();
      return json.data;
    },
  });
  const settings = useQuery({
    queryKey: ["scheduling-settings"],
    queryFn: async (): Promise<SchedulingSettings> => {
      const response = await fetch("/api/v1/settings/scheduling", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load scheduling settings");
      const json: { data: SchedulingSettings } = await response.json();
      return json.data;
    },
  });
  const bookings = useQuery({
    queryKey: ["bookings", weekStart.toISOString(), weekEnd.toISOString()],
    queryFn: async ({ signal }): Promise<ApiBooking[]> => {
      const query = new URLSearchParams({ from: weekStart.toISOString(), to: weekEnd.toISOString() });
      const response = await fetch(`/api/v1/bookings?${query}`, { signal, cache: "no-store" });
      if (!response.ok) throw new Error("Could not load bookings");
      const json: { data: ApiBooking[] } = await response.json();
      return json.data;
    },
  });
  const detail = useQuery({
    queryKey: ["availability-detail", selectedId],
    enabled: selectedId !== null,
    queryFn: async (): Promise<WindowDetail> => {
      const response = await fetch(`/api/v1/availability/${selectedId}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load this availability window");
      const json: { data: WindowDetail } = await response.json();
      return json.data;
    },
  });
  const slots = availability.data ?? [];

  const create = useMutation({
    mutationFn: async (input: { startsAt: string; endsAt: string; sessionMinutes: number; bufferMinutes: number }) => {
      const response = await fetch("/api/v1/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        throw new Error(await apiError(response, "Could not save availability. Please try again."));
      }
      const json: { data: ApiSlot } = await response.json();
      return json.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["availability"] }),
  });

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return {
      label: new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(date),
      date: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(date),
    };
  }), [weekStart]);
  const calendarSlots: CalendarSlot[] = [...slots.map((slot) => {
    const start = new Date(slot.startsAt);
    const day = Math.round((startOfWeek(start).getTime() - weekStart.getTime()) / 604_800_000) * 7 + ((start.getDay() + 6) % 7);
    return { id: slot.id, day, startsAt: displayTime(start), endsAt: displayTime(new Date(slot.endsAt)), label: "Availability window", state: "open" } as CalendarSlot;
  }), ...(bookings.data ?? []).map((booking) => {
    const start = new Date(booking.startsAt);
    const day = Math.round((startOfWeek(start).getTime() - weekStart.getTime()) / 604_800_000) * 7 + ((start.getDay() + 6) % 7);
    return { id: booking.id, day, startsAt: displayTime(start), endsAt: displayTime(new Date(booking.endsAt)), label: booking.name, state: "booked" } as CalendarSlot;
  })];
  const title = `${days[0].date} – ${days[6].date}`;

  async function createSlot(input: { startsAt: string; endsAt: string; sessionMinutes: number; bufferMinutes: number }) {
    try {
      const created = await create.mutateAsync(input);
      setWeekStart(startOfWeek(new Date(created.startsAt)));
      setSelectedId(created.id);
      setLinks([]);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Could not save the slot. Please try again.";
    }
  }

  async function editSlot(input: { startsAt: string; endsAt: string; sessionMinutes: number; bufferMinutes: number; revokePublished: boolean }) {
    const response = await fetch(`/api/v1/availability/${selectedId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
    if (!response.ok) return apiError(response, "Could not update availability");
    setLinks([]);
    await Promise.all([queryClient.invalidateQueries({ queryKey: ["availability"] }), queryClient.invalidateQueries({ queryKey: ["availability-detail", selectedId] })]);
    return null;
  }

  async function releaseSlot(input: { recipients: { name: string; email: string }[]; sendEmail: boolean }) {
    const response = await fetch(`/api/v1/availability/${selectedId}/release`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
    if (!response.ok) return apiError(response, "Could not create booking links");
    const json: { data: { links: ReleasedLink[] } } = await response.json();
    setLinks(json.data.links);
    await queryClient.invalidateQueries({ queryKey: ["availability-detail", selectedId] });
    return null;
  }

  function moveWeek(by: number) {
    setWeekStart((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + by * 7);
      return next;
    });
  }

  return (
    <Stack gap="5">
      {!testingWorkspace && <TrialNotice endsAt={trialEndsAt} paidThrough={paidThrough} now={renderedAt} />}
      <Inline gap="3">
        <Button type="button" variant="surface" onClick={() => moveWeek(-1)}>Previous week</Button>
        <Button type="button" variant="surface" onClick={() => setWeekStart(startOfWeek(new Date()))}>This week</Button>
        <Button type="button" variant="surface" onClick={() => moveWeek(1)}>Next week</Button>
        <Link data-dt="button" data-variant="surface" href="/api/v1/availability/export">Export availability</Link>
      </Inline>
      {availability.isError ? <EmptyState title="Calendar unavailable" description="We couldn’t load this week’s availability." action={<Button onClick={() => void availability.refetch()}>Try again</Button>} /> :
        <AvailabilityCalendar title={title} days={days} slots={calendarSlots} onSlotOpen={(id) => { setSelectedId(id); setLinks([]); }} headerAction={availability.isPending ? <span>Loading…</span> : undefined} />}
      {!availability.isPending && !availability.isError && slots.length === 0 && <EmptyState title="No lesson slots this week" description="Create an available lesson slot below. Learners will not see it until you release it." />}
      {selectedId && (detail.data ? <AvailabilityWindowPanel key={selectedId} detail={detail.data} links={links} onEdit={editSlot} onRelease={releaseSlot} onClose={() => setSelectedId(null)} /> : detail.isError ? <EmptyState title="Could not open availability" description="Try opening the window again." action={<Button onClick={() => void detail.refetch()}>Try again</Button>} /> : <p>Opening availability…</p>)}
      <AvailabilityForm onCreate={createSlot} disabled={!active} defaultSessionMinutes={settings.data?.defaultSessionMinutes} defaultBufferMinutes={settings.data?.bufferWarningMinutes} />
    </Stack>
  );
}
