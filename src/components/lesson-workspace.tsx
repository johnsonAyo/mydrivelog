"use client";

import { useState, useSyncExternalStore } from "react";
import { LessonDetail, type LessonFields, type LessonPreview, type LessonSkill } from "@drivetrack/ui";
import { LessonWorkspaceStore } from "./lesson-workspace-store";

type ActivePreview = LessonPreview & { kind: "recap" | "follow_up"; correction: string; idempotencyKey: string };

async function post<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) {
    const problem: { detail?: string } = await response.json().catch(() => ({}));
    throw new Error(problem.detail ?? "The lesson could not be updated. Please try again.");
  }
  return response.json() as Promise<T>;
}

export function LessonWorkspace({ bookingId, writable }: { bookingId: string; writable: boolean }) {
  const [store] = useState(() => new LessonWorkspaceStore(bookingId, writable));
  const { lesson, fields, status, error, loadError } = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const [actionError, setActionError] = useState<string | null>(null);
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
  function run(work: () => Promise<void>) {
    if (!store.startAction()) return;
    setBusy(true); setActionError(null);
    void work().catch((cause) => setActionError(cause instanceof Error ? cause.message : "Please try again."))
      .finally(() => { store.endAction(); setBusy(false); });
  }
  function complete() { run(async () => {
    if (!await store.saveNow()) return;
    const current = store.getSnapshot().fields;
    const empty = current && !(
      current.privateNotes.trim() || current.whatWeWorkedOn.trim() || current.whatToPractise.trim() ||
      current.nextLessonFocus.trim() || current.skills.some((item) => item.skill.trim())
    );
    if (empty && !window.confirm("Complete this lesson without notes or skill outcomes?")) return;
    await post(base + "/complete", { acknowledgeEmpty: Boolean(empty) });
    await store.reload(false);
  }); }
  function previewMessage(kind: "recap" | "follow_up") { run(async () => {
    if (!await store.saveNow()) return;
    const result = await post<{ data: LessonPreview }>(base + "/preview", { kind, correction: kind === "follow_up" ? correction : undefined });
    setPreview({ ...result.data, kind, correction, idempotencyKey: crypto.randomUUID() });
  }); }
  function send() { if (!preview) return; run(async () => {
    if (!await store.saveNow()) return;
    await post(base + "/messages", { kind: preview.kind, correction: preview.kind === "follow_up" ? preview.correction : undefined,
      idempotencyKey: preview.idempotencyKey, previewHash: preview.hash, expectedRevision: store.getRevision() });
    setPreview(null); setCorrection(""); await store.reload(false);
  }); }
  function retry(messageId: string) { run(async () => {
    await post(`${base}/messages/${messageId}/retry`, {});
    await store.reload(false);
  }); }

  if (!lesson || !fields) return <p role={loadError ? "alert" : "status"}>{loadError ?? status}</p>;
  return <><LessonDetail lesson={lesson} fields={fields} saveStatus={status} error={error} busy={busy} writable={writable}
    preview={preview} correction={correction} onChange={change} onAddSkill={() => update({ ...fields, skills: [...fields.skills, { skill: "", outcome: "introduced" }] })}
    onChangeSkill={changeSkill} onRemoveSkill={(index) => update({ ...fields, skills: fields.skills.filter((_, i) => i !== index) })}
    onComplete={complete} onPreview={previewMessage} onSend={send} onRetry={retry} onRetrySave={() => { void store.saveNow(); }}
    onCorrectionChange={(value) => { setCorrection(value); setPreview(null); }} />
    {actionError && <p role="alert" data-dt="lesson-action-error">{actionError}</p>}
  </>;
}
