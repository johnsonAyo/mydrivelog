import { afterEach, describe, expect, it, vi } from "vitest";
import { LessonWorkspaceStore } from "./lesson-workspace-store";

const lesson = {
  id: "booking-1",
  draft: { revision: 0, privateNotes: "", whatWeWorkedOn: "", whatToPractise: "", nextLessonFocus: "", skills: [] },
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("LessonWorkspaceStore", () => {
  it("loads on subscription and debounces draft saves without an effect", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ data: lesson }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { ...lesson, draft: { ...lesson.draft, revision: 1 } } }) });
    vi.stubGlobal("fetch", fetcher);
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    vi.stubGlobal("window", { addEventListener, removeEventListener });

    const store = new LessonWorkspaceStore("booking-1", true);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    await vi.waitFor(() => expect(store.getSnapshot().status).toBe("Saved"));
    store.update({ ...store.getSnapshot().fields!, privateNotes: "Watch mirror checks" });
    expect(store.getSnapshot().status).toBe("Unsaved changes");
    await vi.advanceTimersByTimeAsync(700);
    await vi.waitFor(() => expect(store.getSnapshot().status).toBe("Saved"));

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[1][1].method).toBe("PATCH");
    expect(JSON.parse(fetcher.mock.calls[1][1].body).privateNotes).toBe("Watch mirror checks");
    unsubscribe();
    expect(addEventListener).toHaveBeenCalledWith("beforeunload", expect.any(Function));
    expect(removeEventListener).toHaveBeenCalledWith("beforeunload", expect.any(Function));
  });
});
