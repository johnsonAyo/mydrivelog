import { describe, expect, it } from "vitest";
import { canCompleteLesson } from "./lesson-policy";

const empty = { privateNotes: "", whatWeWorkedOn: "", whatToPractise: "", nextLessonFocus: "", skills: [], revision: 0, completedAt: null, updatedAt: null };

describe("lesson completion", () => {
  it("requires acknowledgement only for an empty debrief", () => {
    expect(canCompleteLesson(empty, false)).toBe(false);
    expect(canCompleteLesson(empty, true)).toBe(true);
    expect(canCompleteLesson({ ...empty, privateNotes: "Preparation" }, false)).toBe(true);
  });
});
