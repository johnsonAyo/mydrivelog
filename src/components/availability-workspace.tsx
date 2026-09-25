"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { CollectionChooser, CollectionEditor, EmptyState, Stack, TrialNotice, type CollectionDetail, type CollectionFeedbackArea, type CollectionSummary, type ContactOption, type SchedulingSettings, type SlotInput } from "@drivetrack/ui";
import { generateExactSlots } from "@/domain/collections/slot-policy";

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<Feedback | null>(null);
  const [notice, setNotice] = useState<Feedback | null>(null);
  const [generalUrl, setGeneralUrl] = useState<string | null>(null);
  const [lastInvitation, setLastInvitation] = useState<{ url: string; emailStatus: string } | null>(null);
  const queryClient = useQueryClient();
  const active = testingWorkspace || (trialEndsAt !== null && new Date(trialEndsAt) > new Date(renderedAt)) || (paidThrough !== null && new Date(paidThrough) > new Date(renderedAt));
  const defaultName = `Week of ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" }).format(new Date(`${initialDate}T12:00:00`))}`;

  const index = useQuery({ queryKey: ["collections"], queryFn: async (): Promise<CollectionIndex> => {
    const response = await fetch("/api/v1/collections", { cache: "no-store" });
    if (!response.ok) throw new Error(await apiError(response, "Could not load availability lists."));
    const json: { data: CollectionIndex } = await response.json();
    return json.data;
  } });
  const activeId = selectedId ?? index.data?.collections[0]?.id ?? null;
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

  async function create(name: string) {
    await execute("create", async () => {
      const json = await jsonRequest<{ data: { id: string } }>("/api/v1/collections", "POST", { name });
      setSelectedId(json.data.id); setGeneralUrl(null); setLastInvitation(null);
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

  return <Stack gap="5">
    {!testingWorkspace && <TrialNotice endsAt={trialEndsAt} paidThrough={paidThrough} now={renderedAt} />}
    {index.isError ? <EmptyState title="Availability unavailable" description="We couldn’t load your lists. Try refreshing the page." /> : <CollectionChooser collections={index.data?.collections ?? []} selectedId={activeId} defaultName={defaultName} onCreate={create} onSelect={(id) => { setSelectedId(id); setGeneralUrl(null); setLastInvitation(null); setError(null); }} busy={creating || !active} error={error?.area === "create" ? error.message : null} />}
    {activeId && (detail.data ? <CollectionEditor key={`${activeId}-${settings.data?.defaultSessionMinutes ?? 120}-${settings.data?.bufferWarningMinutes ?? 30}`} collection={detail.data} contacts={index.data?.contacts ?? []} defaultDuration={settings.data?.defaultSessionMinutes ?? 120} defaultGap={settings.data?.bufferWarningMinutes ?? 30} onSaveSlot={saveSlot} onSetStatus={setStatus} onGenerate={generate} onInvite={invite} onGeneralLink={makeGeneralLink} generalUrl={generalUrl} lastInvitation={lastInvitation} busy={editing || !active} error={error?.area !== "create" ? error?.message ?? null : null} errorArea={error?.area !== "create" ? error?.area ?? null : null} notice={notice?.message ?? null} noticeArea={notice?.area !== "create" ? notice?.area ?? null : null} /> : detail.isError ? <EmptyState title="Could not open this list" description="Please choose it again or refresh the page." /> : <p>Opening your time list…</p>)}
  </Stack>;
}
