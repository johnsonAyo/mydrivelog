// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button, Skeleton, Spinner } from "./primitives";
import { usePendingAction } from "./pending-action";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("loading primitives", () => {
  it("keeps a loading button's label while disabling it and marking it busy", () => {
    const html = renderToStaticMarkup(<Button type="submit" loading>Save learner</Button>);
    expect(html).toContain("disabled");
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('data-dt="spinner"');
    expect(html).toContain("Save learner");
  });

  it("announces a spinner and hides skeletons from assistive tech", () => {
    const spinner = renderToStaticMarkup(<Spinner label="Saving" />);
    expect(spinner).toContain('role="status"');
    expect(spinner).toContain("Saving");
    expect(renderToStaticMarkup(<Skeleton />)).toContain('aria-hidden="true"');
  });

  it("spins only the pressed action when a view shares one busy flag", async () => {
    function Actions({ busy }: { busy: boolean }) {
      const pending = usePendingAction(busy);
      return <>{["recap", "send"].map((key) => <Button key={key} type="button" disabled={busy} loading={pending.is(key)} onClick={() => pending.start(key)}>{key}</Button>)}</>;
    }
    const host = document.body.appendChild(document.createElement("div"));
    const root = createRoot(host);
    await act(async () => root.render(<Actions busy={false} />));
    await act(async () => host.querySelectorAll("button")[1].click());
    await act(async () => root.render(<Actions busy />));
    const [recap, send] = [...host.querySelectorAll("button")];
    expect(send.getAttribute("aria-busy")).toBe("true");
    expect(recap.getAttribute("aria-busy")).not.toBe("true");
    expect(recap.disabled).toBe(true);
    await act(async () => root.render(<Actions busy={false} />));
    expect(host.querySelector('[aria-busy="true"]')).toBeNull();
    await act(async () => root.unmount());
    host.remove();
  });
});
