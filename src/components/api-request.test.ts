import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, requestJson } from "./api-request";

function respondWith(response: Response | Error) {
  vi.stubGlobal("fetch", vi.fn(async () => { if (response instanceof Error) throw response; return response; }));
}

describe("requestJson", () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it("returns the parsed body of a successful response", async () => {
    respondWith(new Response(JSON.stringify({ data: { id: "slot-1" } }), { status: 201 }));
    expect(await requestJson("/api/v1/collections", { method: "POST", body: {} })).toEqual({ data: { id: "slot-1" } });
  });

  it("turns a problem response into an error carrying its title, status and reference", async () => {
    respondWith(new Response(JSON.stringify({ title: "Choose a future start and end, between 15 minutes and 8 hours apart", correlationId: "c-42" }), { status: 400 }));
    const failure = await requestJson("/api/v1/collections/1/slots", { method: "POST", body: {} }).catch((cause: unknown) => cause);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ message: "Choose a future start and end, between 15 minutes and 8 hours apart", status: 400, correlationId: "c-42" });
  });

  it("falls back to a generic message when the error body is not JSON", async () => {
    respondWith(new Response("Bad gateway", { status: 502 }));
    await expect(requestJson("/api/v1/learners")).rejects.toMatchObject({ message: "Something went wrong. Please try again.", status: 502 });
  });

  it("explains a network failure instead of surfacing the browser's TypeError", async () => {
    respondWith(new TypeError("Failed to fetch"));
    await expect(requestJson("/api/v1/learners")).rejects.toMatchObject({ message: "We couldn’t reach MyDriveLog. Check your connection and try again.", status: 0 });
  });
});
