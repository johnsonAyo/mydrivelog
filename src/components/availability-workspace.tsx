"use client";

import { useMemo, useState } from "react";
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AvailabilityCalendar, AvailabilityForm, Button, EmptyState, Inline, Stack, TrialNotice, type CalendarSlot } from "@drivetrack/ui";

type ApiSlot = { id: string; startsAt: string; endsAt: string; status: "open" };

function startOfWeek(date: Date) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

function displayTime(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(date);
}

export function AvailabilityWorkspace({ trialEndsAt, paidThrough, renderedAt, initialDate }: {
  trialEndsAt: string | null;
  paidThrough: string | null;
  renderedAt: string;
  initialDate: string;
}) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }));
  return <QueryClientProvider client={queryClient}><AvailabilityWorkspaceContent trialEndsAt={trialEndsAt} paidThrough={paidThrough} renderedAt={renderedAt} initialDate={initialDate} /></QueryClientProvider>;
}

function AvailabilityWorkspaceContent({ trialEndsAt, paidThrough, renderedAt, initialDate }: {
  trialEndsAt: string | null;
  paidThrough: string | null;
  renderedAt: string;
  initialDate: string;
}) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(`${initialDate}T12:00:00`)));
  const queryClient = useQueryClient();
  const active = (trialEndsAt !== null && new Date(trialEndsAt) > new Date(renderedAt)) ||
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
  const slots = availability.data ?? [];

  const create = useMutation({
    mutationFn: async (input: { startsAt: string; endsAt?: string }) => {
      const response = await fetch("/api/v1/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const body: { detail?: string } = await response.json().catch(() => ({}));
        throw new Error(body.detail ?? "Could not save the slot. Please try again.");
      }
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
  const calendarSlots: CalendarSlot[] = slots.map((slot) => {
    const start = new Date(slot.startsAt);
    const day = Math.round((startOfWeek(start).getTime() - weekStart.getTime()) / 604_800_000) * 7 + ((start.getDay() + 6) % 7);
    return { id: slot.id, day, startsAt: displayTime(start), endsAt: displayTime(new Date(slot.endsAt)), label: "Available lesson", state: "open" };
  });
  const title = `${days[0].date} – ${days[6].date}`;

  async function createSlot(input: { startsAt: string; endsAt?: string }) {
    try {
      await create.mutateAsync(input);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Could not save the slot. Please try again.";
    }
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
      <TrialNotice endsAt={trialEndsAt} paidThrough={paidThrough} now={renderedAt} />
      <Inline gap="3">
        <Button type="button" variant="surface" onClick={() => moveWeek(-1)}>Previous week</Button>
        <Button type="button" variant="surface" onClick={() => setWeekStart(startOfWeek(new Date()))}>This week</Button>
        <Button type="button" variant="surface" onClick={() => moveWeek(1)}>Next week</Button>
        <a data-dt="button" data-variant="surface" href="/api/v1/availability/export">Export availability</a>
      </Inline>
      {availability.isError ? <EmptyState title="Calendar unavailable" description="We couldn’t load this week’s availability." action={<Button onClick={() => void availability.refetch()}>Try again</Button>} /> :
        <AvailabilityCalendar title={title} days={days} slots={calendarSlots} headerAction={availability.isPending ? <span>Loading…</span> : undefined} />}
      {!availability.isPending && !availability.isError && slots.length === 0 && <EmptyState title="No lesson slots this week" description="Create an available lesson slot below. Learners will not see it until you release it." />}
      <AvailabilityForm onCreate={createSlot} disabled={!active} />
    </Stack>
  );
}
