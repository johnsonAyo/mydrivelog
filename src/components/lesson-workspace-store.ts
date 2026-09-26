import { toast, type LessonFields, type LessonView } from "@drivetrack/ui";
import { errorMessage, requestJson } from "./api-request";

type LessonSnapshot = {
  lesson: LessonView | null;
  fields: LessonFields | null;
  status: string;
  error: string | null;
  loadError: string | null;
};

const SAVE_FAILURE_TOAST = "lesson-autosave-failed";

function draftFields(lesson: LessonView): LessonFields {
  return { privateNotes: lesson.draft.privateNotes, whatWeWorkedOn: lesson.draft.whatWeWorkedOn,
    whatToPractise: lesson.draft.whatToPractise, nextLessonFocus: lesson.draft.nextLessonFocus,
    skills: lesson.draft.skills };
}

export class LessonWorkspaceStore {
  private snapshot: LessonSnapshot = { lesson: null, fields: null, status: "Loading lesson…", error: null, loadError: null };
  private listeners = new Set<() => void>();
  private loaded = false;
  private savedFields = "";
  private revision = 0;
  private savePromise: Promise<boolean> | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private actionBusy = false;
  private readonly base: string;

  constructor(bookingId: string, private readonly writable: boolean) {
    this.base = `/api/v1/lessons/${bookingId}`;
  }

  getSnapshot = () => this.snapshot;
  getServerSnapshot = () => this.snapshot;
  getRevision = () => this.revision;
  getBase = () => this.base;

  startAction() {
    if (this.actionBusy) return false;
    this.actionBusy = true;
    return true;
  }

  endAction() { this.actionBusy = false; }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    if (!this.loaded) {
      this.loaded = true;
      void this.reload(true).catch((cause) => this.patch({
        status: "Could not load lesson",
        loadError: cause instanceof Error ? cause.message : "Could not load lesson",
      }));
    }
    if (this.listeners.size === 1) window.addEventListener("beforeunload", this.warnBeforeUnload);
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        window.removeEventListener("beforeunload", this.warnBeforeUnload);
        this.clearSaveTimer();
      }
    };
  };

  private patch(update: Partial<LessonSnapshot>) {
    this.snapshot = { ...this.snapshot, ...update };
    this.listeners.forEach((listener) => listener());
  }

  private warnBeforeUnload = (event: BeforeUnloadEvent) => {
    if (this.isDirty()) { event.preventDefault(); event.returnValue = ""; }
  };

  private isDirty() {
    return this.snapshot.fields !== null && JSON.stringify(this.snapshot.fields) !== this.savedFields;
  }

  private clearSaveTimer() {
    if (this.saveTimer !== null) clearTimeout(this.saveTimer);
    this.saveTimer = null;
  }

  update(fields: LessonFields) {
    this.patch({ fields, status: "Unsaved changes", error: null });
    this.clearSaveTimer();
    if (this.writable && this.listeners.size > 0) this.saveTimer = setTimeout(() => { void this.saveNow(); }, 700);
  }

  async reload(replaceFields: boolean) {
    const { data } = await requestJson<{ data: LessonView }>(this.base);
    this.revision = data.draft.revision;
    if (replaceFields) {
      const fields = draftFields(data);
      this.savedFields = JSON.stringify(fields);
      this.patch({ lesson: data, fields, status: "Saved", error: null, loadError: null });
    } else this.patch({ lesson: data });
  }

  async saveNow(): Promise<boolean> {
    if (!this.writable || !this.snapshot.fields) return false;
    this.clearSaveTimer();
    if (this.savePromise) return this.savePromise;
    const pending = (async () => {
      try {
        while (this.snapshot.fields && this.isDirty()) {
          const current = this.snapshot.fields;
          this.patch({ status: "Saving…", error: null });
          const persistedFields = { ...current, skills: current.skills.filter((item) => item.skill.trim()) };
          const { data } = await requestJson<{ data: LessonView }>(this.base, { method: "PATCH", body: { expectedRevision: this.revision, ...persistedFields } });
          this.revision = data.draft.revision;
          this.savedFields = JSON.stringify(current);
          this.patch({ lesson: data });
        }
        this.patch({ status: "Saved" });
        toast.dismiss(SAVE_FAILURE_TOAST);
        return true;
      } catch (cause) {
        this.patch({ status: "Save failed", error: errorMessage(cause) });
        toast.error({ id: SAVE_FAILURE_TOAST, title: "Your lesson notes aren’t saved", description: errorMessage(cause), action: { label: "Retry save", onClick: () => { void this.saveNow(); } } });
        return false;
      }
    })();
    this.savePromise = pending;
    try { return await pending; } finally { this.savePromise = null; }
  }
}
