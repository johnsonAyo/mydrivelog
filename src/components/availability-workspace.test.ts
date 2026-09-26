import { describe, expect, it } from "vitest";
import { apiError } from "./api-error";

describe("availability API errors", () => {
  it("shows the problem title returned by the API", async () => {
    const response = new Response(JSON.stringify({ title: "Choose a future start and end, between 15 minutes and 8 hours apart" }), { status: 400 });
    expect(await apiError(response, "Could not save this change")).toBe("Choose a future start and end, between 15 minutes and 8 hours apart");
  });
});
