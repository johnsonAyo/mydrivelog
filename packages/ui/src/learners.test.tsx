import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LearnerDirectory } from "./learners";

describe("learner directory", () => {
  it("shows saved contact details and upcoming lessons without exposing a booking link", () => {
    const html = renderToStaticMarkup(<LearnerDirectory learners={[{
      id: "learner-1", name: "Alex Taylor", email: "alex@example.com", sourceEmail: "alex@example.com", upcomingLessons: 2,
    }]} onSave={async () => {}} busy={false} message={null} />);

    expect(html).toContain("Your learners");
    expect(html).toContain("Alex Taylor");
    expect(html).toContain("alex@example.com");
    expect(html).toContain("2 upcoming lessons");
    expect(html).toContain("Add learner");
    expect(html).not.toContain("/book/availability/");
  });
});
