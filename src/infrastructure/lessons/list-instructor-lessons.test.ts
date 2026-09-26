import { describe, expect, it, vi } from "vitest";

const query = vi.hoisted(() => vi.fn((_strings: TemplateStringsArray, ...values: unknown[]): Promise<Array<Record<string, unknown>>> => {
  values.forEach((value) => Buffer.byteLength(value as string));
  return Promise.resolve([{
    id: "lesson-1",
    name: "Alex",
    starts_at: new Date("2026-09-26T08:00:00.000Z"),
    ends_at: new Date("2026-09-26T10:00:00.000Z"),
    status: "confirmed",
    completed_at: null,
  }]);
}));

vi.mock("@/infrastructure/database/client", () => ({
  getDatabase: () => ({ client: query }),
}));

import { listInstructorLessons } from "./list-instructor-lessons";

describe("listInstructorLessons", () => {
  it("passes timestamp parameters as strings so the server SQL driver can bind them", async () => {
    const lessons = await listInstructorLessons("workspace-1", new Date("2026-09-26T12:00:00.000Z"));

    expect(lessons).toHaveLength(1);
    expect(lessons[0].state).toBe("awaiting-debrief");
    expect(query).toHaveBeenCalledOnce();
  });

  it("normalizes timestamp strings returned by the bundled SQL driver", async () => {
    query.mockResolvedValueOnce([{
      id: "lesson-2",
      name: "Sam",
      starts_at: "2026-09-26 08:00:00+00",
      ends_at: "2026-09-26 10:00:00+00",
      status: "confirmed",
      completed_at: null,
    }]);

    const lessons = await listInstructorLessons("workspace-1", new Date("2026-09-26T12:00:00.000Z"));

    expect(lessons[0].state).toBe("awaiting-debrief");
    expect(lessons[0].time).toBe("09:00");
  });
});
