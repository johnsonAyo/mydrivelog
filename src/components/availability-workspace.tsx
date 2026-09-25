"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { CollectionChooser, CollectionEditor, EmptyState, Stack, TrialNotice, type CollectionDetail, type CollectionFeedbackArea, type CollectionSummary, type ContactOption, type PublicCollection, type SchedulingSettings, type SlotInput } from "@drivetrack/ui";
import { generateExactSlots } from "@/domain/collections/slot-policy";
import { addCalendarDays, mondayOf, weekLabel, weeksTouchingMonth } from "@/domain/collections/week";

type CollectionIndex = { collections: CollectionSummary[]; contacts: ContactOption[] };
type FeedbackArea = CollectionFeedbackArea | "create";
type Feedback = { area: FeedbackArea; message: string };

export async function apiError(response: Response, fallback: string) {
  const body: { detail?: string; title?: string } = await response.json().catch(() => ({}));
  return body.detail ?? body.title ?? fallback;
}

async function jsonRequest<T>(url: string, method: "POST" | "PATCH", body: unknown): Promise<T> {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(await apiError(response, "Could not save this change. Please try again."));
  return response.json() as Promise<T>;
}

export function AvailabilityWorkspace({ trialEndsAt, paidThrough, renderedAt, initialDate, testingWorkspace }: {
  trialEndsAt: string | null; paidThrough: string | null; renderedAt: string; initialDate: string; testingWorkspace: boolean;
}) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: 1 } } }));
  return <QueryClientProvider client={queryClient}><AvailabilityWorkspaceContent trialEndsAt={trialEndsAt} paidThrough={paidThrough} renderedAt={renderedAt} initialDate={initialDate} testingWorkspace={testingWorkspace} /></QueryClientProvider>;
}

function AvailabilityWorkspaceContent({ trialEndsAt, paidThrough, renderedAt, initialDate, testingWorkspace }: {
  trialEndsAt: string | null; paidThrough: string | null; renderedAt: string; initialDate: string; testingWorkspace: boolean;
}) {
  const [selectedWeek, setSelectedWeek] = useState<string | null>(() => mondayOf(initialDate));
  const [legacyId, setLegacyId] = useState<string | null>(null);
  const [month, setMonth] = useState(initialDate.slice(0, 7));
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<Feedback | null>(null);
  const [notice, setNotice] = useState<Feedback | null>(null);
  const [generalUrl, setGeneralUrl] = useState<string | null>(null);
  const [lastInvitation, setLastInvitation] = useState<{ url: string; emailStatus: string } | null>(null);
  const queryClient = useQueryClient();
  const active = testingWorkspace || (trialEndsAt !== null && new Date(trialEndsAt) > new Date(renderedAt)) || (paidThrough !== null && new Date(paidThrough) > new Date(renderedAt));

  const index = useQuery({ queryKey: ["collections"], queryFn: async (): Promise<CollectionIndex> => {
    const response = await fetch("/api/v1/collections", { cache: "no-store" });
    if (!response.ok) throw new Error(await apiError(response, "Could not load availability lists."));
    const json: { data: CollectionIndex } = await response.json();
    return json.data;
  } });
  const collections = index.data?.collections ?? [];
  const weeks = weeksTouchingMonth(month).map((weekStart) => ({
    weekStart,
    label: weekLabel(weekStart),
    collection: collections.find((collection) => collection.weekStart === weekStart) ?? null,
    isPast: addCalendarDays(weekStart, 6) < initialDate,
  }));
  const activeId = legacyId ?? collections.find((collection) => collection.weekStart === selectedWeek)?.id ?? null;
  const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T12:00:00.000Z`));
  function moveMonth(offset: number) {
    const first = new Date(`${month}-01T12:00:00.000Z`);
    first.setUTCMonth(first.getUTCMonth() + offset);
    const next = first.toISOString().slice(0, 7);
    setMonth(next);
    const nextWeeks = weeksTouchingMonth(next);
    setSelectedWeek((current) => next === initialDate.slice(0, 7) ? mondayOf(initialDate) : current && nextWeeks.includes(current) ? current : nextWeeks.find((week) => addCalendarDays(week, 6) >= initialDate) ?? nextWeeks[0]);
    setLegacyId(null);
    setGeneralUrl(null); setLastInvitation(null); setError(null);
  }
  function selectCollection(id: string) {
    const selected = collections.find((collection) => collection.id === id);
    if (selected?.weekStart) { setSelectedWeek(selected.weekStart); setLegacyId(null); }
    else { setSelectedWeek(null); setLegacyId(id); }
    setGeneralUrl(null); setLastInvitation(null); setError(null);
  }
  const settings = useQuery({ queryKey: ["scheduling-settings"], queryFn: async (): Promise<SchedulingSettings> => {
    const response = await fetch("/api/v1/settings/scheduling", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load scheduling settings");
    const json: { data: SchedulingSettings } = await response.json();
    return json.data;
  } });
  const detail = useQuery({ queryKey: ["collection", activeId], enabled: activeId !== null, queryFn: async (): Promise<CollectionDetail> => {
    const response = await fetch(`/api/v1/collections/${activeId}`, { cache: "no-store" });
    if (!response.ok) throw new Error(await apiError(response, "Could not open this availability list."));
    const json: { data: CollectionDetail } = await response.json();
    return json.data;
  } });

  async function refresh() {
    await Promise.all([queryClient.invalidateQueries({ queryKey: ["collections"] }), queryClient.invalidateQueries({ queryKey: ["collection", activeId] })]);
  }

  async function execute(area: FeedbackArea, work: () => Promise<void>) {
    if (area === "create") setCreating(true); else setEditing(true);
    setError(null); setNotice(null);
    try { await work(); } catch (cause) { setError({ area, message: cause instanceof Error ? cause.message : "Could not save this change." }); } finally {
      if (area === "create") setCreating(false); else setEditing(false);
    }
  }

  async function create(weekStart: string) {
    await execute("create", async () => {
      await jsonRequest<{ data: { id: string } }>("/api/v1/collections", "POST", { weekStart });
      setSelectedWeek(weekStart); setLegacyId(null); setGeneralUrl(null); setLastInvitation(null);
      await refresh();
    });
  }

  async function saveSlot(input: SlotInput, id?: string) {
    let saved = false;
    await execute("time", async () => {
      const json = await jsonRequest<{ data: { id: string }; warning: string | null }>(`/api/v1/collections/${activeId}/slots${id ? `/${id}` : ""}`, id ? "PATCH" : "POST", input);
      saved = true;
      if (json.warning) setNotice({ area: "time", message: json.warning });
      await refresh();
    });
    return saved;
  }

  async function setStatus(slotId: string, status: "private" | "open" | "closed") {
    await execute("list", async () => {
      await jsonRequest(`/api/v1/collections/${activeId}/slots/${slotId}`, "PATCH", { status });
      await refresh();
    });
  }

  async function generate(input: { date: string; from: string; to: string; duration: number; gap: number }) {
    await execute("generator", async () => {
      if (!input.date || !input.from || !input.to) throw new Error("Choose a date and a start and end for the range.");
      const slots = generateExactSlots({ startsAt: new Date(`${input.date}T${input.from}`), endsAt: new Date(`${input.date}T${input.to}`) }, input.duration, input.gap);
      if (!slots.length) throw new Error("This range does not fit a full lesson. Adjust the range or lesson length.");
      let created = 0;
      try {
        for (const slot of slots) {
          await jsonRequest(`/api/v1/collections/${activeId}/slots`, "POST", { startsAt: slot.startsAt.toISOString(), endsAt: slot.endsAt.toISOString(), makeAvailable: false });
          created++;
        }
      } catch (cause) {
        await refresh();
        throw new Error(`${created} of ${slots.length} times saved. ${cause instanceof Error ? cause.message : "Please review the list."}`);
      }
      setNotice({ area: "generator", message: `${created} lesson ${created === 1 ? "time" : "times"} added. You can edit any one below.` });
      await refresh();
    });
  }

  async function invite(name: string, email: string) {
    await execute("share", async () => {
      const json = await jsonRequest<{ data: { url: string; emailStatus: string } }>(`/api/v1/collections/${activeId}/share`, "POST", { kind: "invite", name, email });
      setLastInvitation(json.data);
      await refresh();
    });
  }

  async function makeGeneralLink() {
    await execute("share", async () => {
      const json = await jsonRequest<{ data: { url: string } }>(`/api/v1/collections/${activeId}/share`, "POST", { kind: "general" });
      setGeneralUrl(json.data.url);
      await refresh();
    });
  }

  async function changeBooking(bookingId: string, action: "cancel" | "reschedule", slotId?: string) {
    await execute("list", async () => {
      const result = await jsonRequest<{ data: { emailStatus: { learner: string; instructor: string } } }>(`/api/v1/collections/${activeId}/bookings/${bookingId}`, "POST", { action, slotId });
      await refresh();
      const delivered = result.data.emailStatus.learner === "sent" && result.data.emailStatus.instructor === "sent";
      setNotice({ area: "list", message: `${action === "cancel" ? "Lesson cancelled" : "Lesson moved"}. Calendar updated.${delivered ? " Both people were emailed." : " Email was not delivered to everyone; please contact the learner directly."}` });
    });
  }

  return <Stack gap="5">
    {!testingWorkspace && <TrialNotice endsAt={trialEndsAt} paidThrough={paidThrough} now={renderedAt} />}
    {index.isError ? <EmptyState title="Availability unavailable" description="We couldn’t load your lists. Try refreshing the page." /> : <CollectionChooser weeks={weeks} earlierLists={collections.filter((collection) => !collection.weekStart)} monthLabel={monthLabel} selectedId={activeId} onPreviousMonth={() => moveMonth(-1)} onNextMonth={() => moveMonth(1)} onCreate={create} onSelect={selectCollection} busy={creating || !active} error={error?.area === "create" ? error.message : null} />}
    {!activeId && !index.isLoading && !index.isError && <EmptyState title="Choose a week to begin" description="Select Plan week above. Add one or more lesson times, save them privately, and share when you are ready." />}
    {activeId && (detail.data ? <CollectionEditor key={`${activeId}-${settings.data?.defaultSessionMinutes ?? 120}-${settings.data?.bufferWarningMinutes ?? 30}`} collection={detail.data} contacts={index.data?.contacts ?? []} defaultDuration={settings.data?.defaultSessionMinutes ?? 120} defaultGap={settings.data?.bufferWarningMinutes ?? 30} onSaveSlot={saveSlot} onSetStatus={setStatus} onGenerate={generate} onInvite={invite} onGeneralLink={makeGeneralLink} onChangeBooking={changeBooking} onPreview={async (kind): Promise<PublicCollection> => { const response = await fetch(`/api/v1/collections/${activeId}/preview?kind=${kind}`, { cache: "no-store" }); if (!response.ok) throw new Error("Preview unavailable"); const json: { data: PublicCollection } = await response.json(); return json.data; }} generalUrl={generalUrl} lastInvitation={lastInvitation} busy={editing || !active} error={error?.area !== "create" ? error?.message ?? null : null} errorArea={error?.area !== "create" ? error?.area ?? null : null} notice={notice?.message ?? null} noticeArea={notice?.area !== "create" ? notice?.area ?? null : null} /> : detail.isError ? <EmptyState title="Could not open this list" description="Please choose it again or refresh the page." /> : <p>Opening your time list…</p>)}
  </Stack>;
}
