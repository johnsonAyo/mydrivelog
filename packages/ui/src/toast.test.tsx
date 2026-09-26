// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster, toast } from "./toast";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLElement;

const visibleToasts = () => [...document.querySelectorAll<HTMLElement>('[data-dt="toast"]')];
const dismissButton = () => document.querySelector<HTMLButtonElement>('button[aria-label="Dismiss notification"]');

beforeEach(async () => {
  host = document.body.appendChild(document.createElement("div"));
  root = createRoot(host);
  await act(async () => root.render(<Toaster />));
});

afterEach(async () => {
  await act(async () => toast.dismiss());
  await vi.waitFor(() => expect(visibleToasts()).toHaveLength(0));
  await act(async () => root.unmount());
  host.remove();
  vi.useRealTimers();
});

describe("toast", () => {
  it("shows a success toast in the polite notifications region", async () => {
    await act(async () => { toast.success("Scheduling settings saved"); });

    const [item] = visibleToasts();
    expect(item.dataset.type).toBe("success");
    expect(item.textContent).toContain("Scheduling settings saved");
    const region = document.querySelector('[data-dt="toast-viewport"]');
    expect(region?.getAttribute("role")).toBe("region");
    expect(region?.getAttribute("aria-live")).toBe("polite");
    expect(document.querySelector('[role="alert"]')).toBeNull();
  });

  it("announces an error assertively with its title and description", async () => {
    await act(async () => { toast.error({ title: "We couldn’t save this learner", description: "Add a valid name and email address" }); });

    expect(visibleToasts().map((item) => item.dataset.type)).toEqual(["error"]);
    expect(document.querySelector('[role="alert"]')?.textContent).toBe("We couldn’t save this learnerAdd a valid name and email address");
  });

  it("closes when the labelled dismiss button is pressed", async () => {
    await act(async () => { toast.error("Google sign-in didn’t finish"); });
    await act(async () => { dismissButton()?.click(); });

    await vi.waitFor(() => expect(visibleToasts()).toHaveLength(0));
  });

  it("runs the optional action", async () => {
    const retry = vi.fn();
    await act(async () => { toast.error({ title: "Your lesson notes aren’t saved", action: { label: "Retry save", onClick: retry } }); });
    const action = [...document.querySelectorAll("button")].find((button) => button.textContent === "Retry save");
    await act(async () => { action?.click(); });

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("replaces a toast that reuses an id instead of stacking", async () => {
    await act(async () => { toast.error({ id: "autosave", title: "First failure" }); });
    await act(async () => { toast.error({ id: "autosave", title: "Second failure" }); });

    expect(visibleToasts().map((item) => item.textContent)).toEqual([expect.stringContaining("Second failure")]);
  });

  it("dismisses a single toast by id", async () => {
    let first = "";
    await act(async () => { first = toast.success("Lesson completed"); toast.info("Google sign-in was closed"); });
    await act(async () => toast.dismiss(first));

    await vi.waitFor(() => expect(visibleToasts().map((item) => item.dataset.type)).toEqual(["info"]));
  });

  it("auto-dismisses after a custom duration", async () => {
    vi.useFakeTimers();
    await act(async () => { toast.success({ title: "Lesson booked", timeout: 1000 }); });
    expect(visibleToasts()).toHaveLength(1);
    await act(async () => { vi.advanceTimersByTime(1000); });
    vi.useRealTimers();

    await vi.waitFor(() => expect(visibleToasts()).toHaveLength(0));
  });
});
