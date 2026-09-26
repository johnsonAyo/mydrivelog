"use client";

import { useState, useSyncExternalStore } from "react";
import { LessonDetail, toast, type LessonFields, type LessonPreview, type LessonSkill } from "@drivetrack/ui";
import { requestJson, toastError } from "./api-request";
import { LessonWorkspaceStore } from "./lesson-workspace-store";

type ActivePreview = LessonPreview & { kind: "recap" | "follow_up"; correction: string; idempotencyKey: string };

function post<T>(url: string, body: unknown): Promise<T> {
  return requestJson<T>(url, { method: "POST", body });
}

function announceDelivery(kind: "recap" | "follow_up", status: string | undefined) {
  const label = kind === "recap" ? "Recap" : "Follow-up";
  if (status === "delivered") toast.success(`${label} sent to the learner`);
  else toast.error({ title: `${label} saved, but the email didn’t send`, description: "Use Retry next to the message to try again." });
}

export function LessonWorkspace({ bookingId, writable }: { bookingId: string; writable: boolean }) {
  const [store] = useState(() => new LessonWorkspaceStore(bookingId, writable));
  const { lesson, fields, status, error, loadError } = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<ActivePreview | null>(null);
  const [correction, setCorrection] = useState("");
  const base = store.getBase();

  function update(next: LessonFields) { store.update(next); setPreview(null); }
  function change(field: keyof Omit<LessonFields, "skills">, value: string) {
    const current = store.getSnapshot().fields;
    if (current) update({ ...current, [field]: value });
  }
  function changeSkill(index: number, value: LessonSkill) {
    const current = store.getSnapshot().fields;
    if (current) update({ ...current, skills: current.skills.map((item, i) => i === index ? value : item) });
  }
  function run(failureTitle: string, work: () => Promise<void>) {
    if (!store.startAction()) return;
    setBusy(true);
    void work().catch((cause) => toastError(failureTitle, cause))
      .finally(() => { store.endAction(); setBusy(false); });
  }
  function complete() { run("We couldn’t complete this lesson", async () => {
    if (!await store.saveNow()) return;
    const current = store.getSnapshot().fields;
    const empty = current && !(
      current.privateNotes.trim() || current.whatWeWorkedOn.trim() || current.whatToPractise.trim() ||
      current.nextLessonFocus.trim() || current.skills.some((item) => item.skill.trim())
    );
    if (empty && !window.confirm("Complete this lesson without notes or skill outcomes?")) return;
    await post(base + "/complete", { acknowledgeEmpty: Boolean(empty) });
    toast.success("Lesson completed");
    await store.reload(false);
  }); }
  function previewMessage(kind: "recap" | "follow_up") { run("We couldn’t prepare the preview", async () => {
    if (!await store.saveNow()) return;
    const result = await post<{ data: LessonPreview }>(base + "/preview", { kind, correction: kind === "follow_up" ? correction : undefined });
    setPreview({ ...result.data, kind, correction, idempotencyKey: crypto.randomUUID() });
  }); }
  function send() { if (!preview) return; run("We couldn’t send this message", async () => {
    if (!await store.saveNow()) return;
    const { data } = await post<{ data: { id: string } }>(base + "/messages", { kind: preview.kind, correction: preview.kind === "follow_up" ? preview.correction : undefined,
      idempotencyKey: preview.idempotencyKey, previewHash: preview.hash, expectedRevision: store.getRevision() });
    setPreview(null); setCorrection(""); await store.reload(false);
    announceDelivery(preview.kind, store.getSnapshot().lesson?.messages.find((message) => message.id === data.id)?.status);
  }); }
  function retry(messageId: string) { run("We couldn’t retry this email", async () => {
    const { data } = await post<{ data: { status: string | null } }>(`${base}/messages/${messageId}/retry`, {});
    await store.reload(false);
    const kind = store.getSnapshot().lesson?.messages.find((message) => message.id === messageId)?.kind ?? "recap";
    announceDelivery(kind, data.status ?? undefined);
  }); }

  if (!lesson || !fields) return <p role={loadError ? "alert" : "status"}>{loadError ?? status}</p>;
  return <LessonDetail lesson={lesson} fields={fields} saveStatus={status} error={error} busy={busy} writable={writable}
    preview={preview} correction={correction} onChange={change} onAddSkill={() => update({ ...fields, skills: [...fields.skills, { skill: "", outcome: "introduced" }] })}
    onChangeSkill={changeSkill} onRemoveSkill={(index) => update({ ...fields, skills: fields.skills.filter((_, i) => i !== index) })}
    onComplete={complete} onPreview={previewMessage} onSend={send} onRetry={retry} onRetrySave={() => { void store.saveNow(); }}
    onCorrectionChange={(value) => { setCorrection(value); setPreview(null); }} />;
}
