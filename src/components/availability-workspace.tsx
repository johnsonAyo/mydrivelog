"use client";

import Link from "next/link";
import { useState } from "react";
import { QueryCache, QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { CollectionChooser, CollectionEditor, EmptyState, Stack, toast, type CollectionDetail, type CollectionFeedbackArea, type CollectionSummary, type ContactOption, type SchedulingSettings, type SlotInput } from "@drivetrack/ui";
import { generateExactSlots } from "@/domain/collections/slot-policy";
import { addCalendarDays, mondayOf, weekLabel, weeksTouchingMonth } from "@/domain/collections/week";
import { errorMessage, requestJson, toastError } from "./api-request";

declare module "@tanstack/react-query" {
  interface Register {
    // `rendersError` marks queries whose first-load failure already has an on-page error state.
    queryMeta: { errorTitle: string; rendersError?: boolean };
  }
}

type CollectionIndex = { collections: CollectionSummary[]; contacts: ContactOption[] };
type FeedbackArea = CollectionFeedbackArea | "create";
type Feedback = { area: FeedbackArea; message: string };

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { staleTime: 15_000, retry: 1 } },
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (query.meta?.rendersError && query.state.data === undefined) return;
        toastError(query.meta?.errorTitle ?? "We couldn’t refresh your calendar", error);
      },
    }),
  });
}

export function AvailabilityWorkspace({ pilotActive, trialEndsAt, paidThrough, renderedAt, initialDate, testingWorkspace }: {
  pilotActive: boolean; trialEndsAt: string | null; paidThrough: string | null; renderedAt: string; initialDate: string; testingWorkspace: boolean;
}) {
  const [queryClient] = useState(createQueryClient);
  return <QueryClientProvider client={queryClient}><AvailabilityWorkspaceContent pilotActive={pilotActive} trialEndsAt={trialEndsAt} paidThrough={paidThrough} renderedAt={renderedAt} initialDate={initialDate} testingWorkspace={testingWorkspace} /></QueryClientProvider>;
}

function AvailabilityWorkspaceContent({ pilotActive, trialEndsAt, paidThrough, renderedAt, initialDate, testingWorkspace }: {
  pilotActive: boolean; trialEndsAt: string | null; paidThrough: string | null; renderedAt: string; initialDate: string; testingWorkspace: boolean;
}) {
  const [selectedWeek, setSelectedWeek] = useState<string | null>(() => mondayOf(initialDate));
  const [month, setMonth] = useState(initialDate.slice(0, 7));
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<Feedback | null>(null);
  const [notice, setNotice] = useState<Feedback | null>(null);
  const queryClient = useQueryClient();
  const active = testingWorkspace || pilotActive || (trialEndsAt !== null && new Date(trialEndsAt) > new Date(renderedAt)) || (paidThrough !== null && new Date(paidThrough) > new Date(renderedAt));

  const index = useQuery({ queryKey: ["collections"], meta: { errorTitle: "We couldn’t load your availability lists", rendersError: true },
    queryFn: async () => (await requestJson<{ data: CollectionIndex }>("/api/v1/collections")).data });
  const collections = index.data?.collections ?? [];
  const weeks = weeksTouchingMonth(month).map((weekStart) => ({
    weekStart,
    label: weekLabel(weekStart),
    collection: collections.find((collection) => collection.weekStart === weekStart) ?? null,
    isPast: addCalendarDays(weekStart, 6) < initialDate,
  }));
  const activeId = weeks.find((week) => week.weekStart === selectedWeek)?.collection?.id ?? null;
  const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T12:00:00.000Z`));
  function moveMonth(offset: number) {
    const first = new Date(`${month}-01T12:00:00.000Z`);
    first.setUTCMonth(first.getUTCMonth() + offset);
    const next = first.toISOString().slice(0, 7);
    setMonth(next);
    const nextWeeks = weeksTouchingMonth(next);
    setSelectedWeek((current) => next === initialDate.slice(0, 7) ? mondayOf(initialDate) : current && nextWeeks.includes(current) ? current : nextWeeks.find((week) => addCalendarDays(week, 6) >= initialDate) ?? nextWeeks[0]);
    setError(null);
  }
  function selectCollection(id: string) {
    const selected = collections.find((collection) => collection.id === id);
    if (selected) setSelectedWeek(selected.weekStart);
    setError(null);
  }
  const settings = useQuery({ queryKey: ["scheduling-settings"], meta: { errorTitle: "We couldn’t load your scheduling defaults" },
    queryFn: async () => (await requestJson<{ data: SchedulingSettings }>("/api/v1/settings/scheduling")).data });
  const detail = useQuery({ queryKey: ["collection", activeId], enabled: activeId !== null, meta: { errorTitle: "We couldn’t open this availability list", rendersError: true },
    queryFn: async () => (await requestJson<{ data: CollectionDetail }>(`/api/v1/collections/${activeId}`)).data });

  async function refresh() {
    await Promise.all([queryClient.invalidateQueries({ queryKey: ["collections"] }), queryClient.invalidateQueries({ queryKey: ["collection", activeId] })]);
  }

  async function execute(area: FeedbackArea, failureTitle: string, work: () => Promise<void>) {
    if (area === "create") setCreating(true); else setEditing(true);
    setError(null); setNotice(null);
    try { await work(); } catch (cause) {
      setError({ area, message: errorMessage(cause) });
      toastError(failureTitle, cause);
    } finally {
      if (area === "create") setCreating(false); else setEditing(false);
    }
  }

  async function create(weekStart: string) {
    await execute("create", "We couldn’t plan this week", async () => {
      await requestJson("/api/v1/collections", { method: "POST", body: { weekStart } });
      setSelectedWeek(weekStart);
      await refresh();
    });
  }

  async function saveSlot(input: SlotInput, id?: string) {
    let saved = false;
    await execute("time", "We couldn’t save this lesson time", async () => {
      const json = await requestJson<{ data: { id: string }; warning: string | null }>(`/api/v1/collections/${activeId}/slots${id ? `/${id}` : ""}`, { method: id ? "PATCH" : "POST", body: input });
      saved = true;
      if (json.warning) setNotice({ area: "time", message: json.warning });
      await refresh();
    });
    return saved;
  }

  async function setStatus(slotId: string, status: "private" | "open" | "closed") {
    await execute("list", "We couldn’t update this lesson time", async () => {
      await requestJson(`/api/v1/collections/${activeId}/slots/${slotId}`, { method: "PATCH", body: { status } });
      await refresh();
    });
  }

  async function generate(input: { date: string; from: string; to: string; duration: number; gap: number }) {
    await execute("generator", "We couldn’t add these lesson times", async () => {
      if (!input.date || !input.from || !input.to) throw new Error("Choose a date and a start and end for the range.");
      const slots = generateExactSlots({ startsAt: new Date(`${input.date}T${input.from}`), endsAt: new Date(`${input.date}T${input.to}`) }, input.duration, input.gap);
      if (!slots.length) throw new Error("This range does not fit a full lesson. Adjust the range or lesson length.");
      let created = 0;
      try {
        for (const slot of slots) {
          await requestJson(`/api/v1/collections/${activeId}/slots`, { method: "POST", body: { startsAt: slot.startsAt.toISOString(), endsAt: slot.endsAt.toISOString(), makeAvailable: false } });
          created++;
        }
      } catch (cause) {
        await refresh();
        throw new Error(`${created} of ${slots.length} times saved. ${errorMessage(cause)}`);
      }
      setNotice({ area: "generator", message: `${created} lesson ${created === 1 ? "time" : "times"} added. You can edit any one below.` });
      await refresh();
    });
  }

  async function changeBooking(bookingId: string, action: "cancel" | "reschedule", slotId?: string) {
    await execute("list", action === "cancel" ? "We couldn’t cancel this lesson" : "We couldn’t move this lesson", async () => {
      const result = await requestJson<{ data: { emailStatus: { learner: string; instructor: string } } }>(`/api/v1/collections/${activeId}/bookings/${bookingId}`, { method: "POST", body: { action, slotId } });
      await refresh();
      const delivered = result.data.emailStatus.learner === "sent" && result.data.emailStatus.instructor === "sent";
      toast.success({ title: action === "cancel" ? "Lesson cancelled" : "Lesson moved", description: delivered ? "Both people were emailed." : "Email didn’t reach everyone. Please contact the learner directly." });
      setNotice({ area: "list", message: `${action === "cancel" ? "Lesson cancelled" : "Lesson moved"}. Calendar updated.${delivered ? " Both people were emailed." : " Email was not delivered to everyone; please contact the learner directly."}` });
    });
  }

  return <Stack gap="5">
    {index.isError ? <EmptyState title="Availability unavailable" description="We couldn’t load your lists. Try refreshing the page." /> : <CollectionChooser weeks={weeks} monthLabel={monthLabel} selectedId={activeId} onPreviousMonth={() => moveMonth(-1)} onNextMonth={() => moveMonth(1)} onCreate={create} onSelect={selectCollection} previewHref={(id) => `/calendar/${id}/preview`} shareHref={(id) => `/calendar/${id}/share`} renderLink={(href, ariaLabel, children) => <Link href={href} aria-label={ariaLabel}>{children}</Link>} busy={creating || !active} error={error?.area === "create" ? error.message : null} />}
    {!activeId && !index.isLoading && !index.isError && <EmptyState title="Choose a week to begin" description="Select Plan week above. Add one or more lesson times, save them privately, and share when you are ready." />}
    {activeId && (detail.data ? <CollectionEditor key={`${activeId}-${settings.data?.defaultSessionMinutes ?? 120}-${settings.data?.bufferWarningMinutes ?? 30}`} collection={detail.data} defaultDuration={settings.data?.defaultSessionMinutes ?? 120} defaultGap={settings.data?.bufferWarningMinutes ?? 30} renderedAt={renderedAt} onSaveSlot={saveSlot} onSetStatus={setStatus} onGenerate={generate} onChangeBooking={changeBooking} lessonHref={(bookingId) => `/lessons/${bookingId}`} renderLessonLink={(href, ariaLabel, children) => <Link href={href} aria-label={ariaLabel}>{children}</Link>} busy={editing || !active} error={error?.area !== "create" ? error?.message ?? null : null} errorArea={error?.area !== "create" ? error?.area ?? null : null} notice={notice?.message ?? null} noticeArea={notice?.area !== "create" ? notice?.area ?? null : null} /> : detail.isError ? <EmptyState title="Could not open this list" description="Please choose it again or refresh the page." /> : <p>Opening your time list…</p>)}
  </Stack>;
}
