"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LessonDetail, type LessonFields, type LessonPreview, type LessonView, type LessonSkill } from "@drivetrack/ui";

type ActivePreview = LessonPreview & { kind: "recap" | "follow_up"; correction: string; idempotencyKey: string };

async function request<T>(url: string, method: "GET" | "PATCH" | "POST" = "GET", body?: unknown): Promise<T> {
  const response = await fetch(url, { method, cache: "no-store", headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body) });
  if (!response.ok) {
    const problem: { detail?: string } = await response.json().catch(() => ({}));
    throw new Error(problem.detail ?? "The lesson could not be updated. Please try again.");
  }
  return response.json() as Promise<T>;
}

export function LessonWorkspace({ bookingId, writable }: { bookingId: string; writable: boolean }) {
  const [lesson, setLesson] = useState<LessonView | null>(null);
  const [fields, setFields] = useState<LessonFields | null>(null);
  const [status, setStatus] = useState("Loading lesson…");
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<ActivePreview | null>(null);
  const [correction, setCorrection] = useState("");
  const fieldsRef = useRef<LessonFields | null>(null);
  const savedRef = useRef("");
  const revisionRef = useRef(0);
  const savePromiseRef = useRef<Promise<boolean> | null>(null);
  const busyRef = useRef(false);
  const base = `/api/v1/lessons/${bookingId}`;

  const reload = useCallback(async (replaceFields: boolean) => {
    const result = await request<{ data: LessonView }>(base);
    setLesson(result.data);
    revisionRef.current = result.data.draft.revision;
    if (replaceFields) {
      const initial = { privateNotes: result.data.draft.privateNotes, whatWeWorkedOn: result.data.draft.whatWeWorkedOn,
        whatToPractise: result.data.draft.whatToPractise, nextLessonFocus: result.data.draft.nextLessonFocus,
        skills: result.data.draft.skills };
      fieldsRef.current = initial;
      savedRef.current = JSON.stringify(initial);
      setFields(initial);
      setStatus("Saved");
    }
  }, [base]);

  useEffect(() => {
    let active = true;
    void request<{ data: LessonView }>(base).then(({ data }) => {
      if (!active) return;
      const initial = { privateNotes: data.draft.privateNotes, whatWeWorkedOn: data.draft.whatWeWorkedOn,
        whatToPractise: data.draft.whatToPractise, nextLessonFocus: data.draft.nextLessonFocus,
        skills: data.draft.skills };
      revisionRef.current = data.draft.revision;
      fieldsRef.current = initial;
      savedRef.current = JSON.stringify(initial);
      setLesson(data);
      setFields(initial);
      setStatus("Saved");
    }).catch((cause) => {
      if (!active) return;
      setStatus("Could not load lesson");
      setActionError(cause instanceof Error ? cause.message : "Could not load lesson");
    });
    return () => { active = false; };
  }, [base]);

  const saveNow = useCallback(async (): Promise<boolean> => {
    if (!writable || !fieldsRef.current) return false;
    if (savePromiseRef.current) return savePromiseRef.current;
    const pending = (async () => {
      try {
        while (fieldsRef.current && JSON.stringify(fieldsRef.current) !== savedRef.current) {
          const current = fieldsRef.current;
          setStatus("Saving…"); setError(null);
          const persistedFields = { ...current, skills: current.skills.filter((item) => item.skill.trim()) };
          const result = await request<{ data: LessonView }>(base, "PATCH", { expectedRevision: revisionRef.current, ...persistedFields });
          revisionRef.current = result.data.draft.revision;
          savedRef.current = JSON.stringify(current);
          setLesson(result.data);
        }
        setStatus("Saved");
        return true;
      } catch (cause) {
        setStatus("Save failed");
        setError(cause instanceof Error ? cause.message : "Could not save your changes.");
        return false;
      }
    })();
    savePromiseRef.current = pending;
    try { return await pending; } finally { savePromiseRef.current = null; }
  }, [base, writable]);

  useEffect(() => {
    if (!fields || JSON.stringify(fields) === savedRef.current || !writable) return;
    const timer = window.setTimeout(() => { void saveNow(); }, 700);
    return () => window.clearTimeout(timer);
  }, [fields, saveNow, writable]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (fieldsRef.current && JSON.stringify(fieldsRef.current) !== savedRef.current) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  function update(next: LessonFields) {
    fieldsRef.current = next; setFields(next); setPreview(null); setStatus("Unsaved changes"); setError(null);
  }
  function change(field: keyof Omit<LessonFields, "skills">, value: string) { if (fieldsRef.current) update({ ...fieldsRef.current, [field]: value }); }
  function changeSkill(index: number, value: LessonSkill) { if (fieldsRef.current) update({ ...fieldsRef.current, skills: fieldsRef.current.skills.map((item, i) => i === index ? value : item) }); }
  function run(work: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true); setActionError(null);
    void work().catch((cause) => setActionError(cause instanceof Error ? cause.message : "Please try again.")).finally(() => { busyRef.current = false; setBusy(false); });
  }
  function complete() { run(async () => {
    if (!await saveNow()) return;
    const current = fieldsRef.current;
    const empty = current && !(
      current.privateNotes.trim() || current.whatWeWorkedOn.trim() || current.whatToPractise.trim() ||
      current.nextLessonFocus.trim() || current.skills.some((item) => item.skill.trim())
    );
    if (empty && !window.confirm("Complete this lesson without notes or skill outcomes?")) return;
    await request(base + "/complete", "POST", { acknowledgeEmpty: Boolean(empty) });
    await reload(false);
  }); }
  function previewMessage(kind: "recap" | "follow_up") { run(async () => {
    if (!await saveNow()) return;
    const result = await request<{ data: LessonPreview }>(base + "/preview", "POST", { kind, correction: kind === "follow_up" ? correction : undefined });
    setPreview({ ...result.data, kind, correction, idempotencyKey: crypto.randomUUID() });
  }); }
  function send() { if (!preview) return; run(async () => {
    if (!await saveNow()) return;
    await request(base + "/messages", "POST", { kind: preview.kind, correction: preview.kind === "follow_up" ? preview.correction : undefined,
      idempotencyKey: preview.idempotencyKey, previewHash: preview.hash, expectedRevision: revisionRef.current });
    setPreview(null); setCorrection(""); await reload(false);
  }); }
  function retry(messageId: string) { run(async () => {
    await request(`${base}/messages/${messageId}/retry`, "POST", {});
    await reload(false);
  }); }

  if (!lesson || !fields) return <p role={actionError ? "alert" : "status"}>{actionError ?? status}</p>;
  return <><LessonDetail lesson={lesson} fields={fields} saveStatus={status} error={error} busy={busy} writable={writable}
    preview={preview} correction={correction} onChange={change} onAddSkill={() => update({ ...fields, skills: [...fields.skills, { skill: "", outcome: "introduced" }] })}
    onChangeSkill={changeSkill} onRemoveSkill={(index) => update({ ...fields, skills: fields.skills.filter((_, i) => i !== index) })}
    onComplete={complete} onPreview={previewMessage} onSend={send} onRetry={retry} onRetrySave={() => { void saveNow(); }}
    onCorrectionChange={(value) => { setCorrection(value); setPreview(null); }} />
    {actionError && <p role="alert" data-dt="lesson-action-error">{actionError}</p>}
  </>;
}
