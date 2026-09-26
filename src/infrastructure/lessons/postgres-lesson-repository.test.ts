import { describe, expect, it, vi } from "vitest";

const query = vi.hoisted(() => vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
  values.forEach((value) => {
    if (value instanceof Date) throw new TypeError("Date cannot be bound by the bundled driver");
  });
  const sql = strings.join("?");
  if (sql.includes("'collection'::text as source")) return Promise.resolve([{
    id: "booking-1", source: "collection", learner_name: "Alex", learner_email: "alex@example.com",
    starts_at: "2026-09-26 08:00:00+00", ends_at: "2026-09-26 10:00:00+00", booking_status: "confirmed",
  }]);
  if (sql.includes("from lesson_debriefs") && sql.includes("private_notes")) return Promise.resolve([{
    private_notes: "Mirror checks", what_we_worked_on: "", what_to_practise: "", next_lesson_focus: "",
    revision: 1, completed_at: "2026-09-26 10:05:00+00", updated_at: "2026-09-26 10:05:00+00",
  }]);
  return Promise.resolve([]);
}));

vi.mock("@/infrastructure/database/client", () => ({ getDatabase: () => ({ client: query }) }));

import { postgresLessonRepository } from "./postgres-lesson-repository";

describe("postgresLessonRepository.find", () => {
  it("normalizes bundled SQL timestamps before domain use or rebinding", async () => {
    const lesson = await postgresLessonRepository.find("workspace-1", "booking-1");

    expect(lesson?.startsAt).toEqual(new Date("2026-09-26T08:00:00.000Z"));
    expect(lesson?.draft.completedAt).toEqual(new Date("2026-09-26T10:05:00.000Z"));
    expect(query).toHaveBeenCalled();
  });
});
