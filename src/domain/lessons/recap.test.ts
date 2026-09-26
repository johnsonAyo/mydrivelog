import { describe, expect, it } from "vitest";
import { formatLessonEmail, hasSharedRecap } from "./recap";

describe("lesson recap", () => {
  it("keeps private notes outside the email contract", () => {
    const recap = { whatWeWorkedOn: "Junctions", whatToPractise: "Mirror checks", nextLessonFocus: "Roundabouts", skills: [{ skill: "Observation", outcome: "developing" as const }] };
    const result = formatLessonEmail({ kind: "recap", learnerName: "Sam", instructorName: "Alex", recap });
    expect(result.body).toContain("Roundabouts");
    expect(result.body).toContain("Observation: Developing");
    expect(hasSharedRecap(recap)).toBe(true);
  });

  it("labels a correction as a follow-up", () => {
    const result = formatLessonEmail({ kind: "follow_up", learnerName: "Sam", instructorName: "Alex", correction: "Practise left turns." });
    expect(result.subject).toContain("Follow-up");
    expect(result.body).toContain("Practise left turns.");
  });
});
