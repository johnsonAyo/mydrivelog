import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PublicCollectionPicker, type PublicCollection } from "./collections";

const collection: PublicCollection = {
  collectionName: "21–27 September 2026",
  instructorName: "Alex",
  timezone: "Europe/London",
  name: null,
  kind: "general",
  slots: [],
  ownBookings: [],
};

function render(slots: PublicCollection["slots"]) {
  return renderToStaticMarkup(
    <PublicCollectionPicker
      collection={{ ...collection, slots }}
      onRequestAccess={async () => {}}
      onBook={async () => {}}
      busy={false}
      error={null}
      notice={null}
    />,
  );
}

describe("public lesson booking page", () => {
  it("does not ask for details when there are no available times", () => {
    const html = render([]);

    expect(html).toContain("No lesson times available right now");
    expect(html).not.toContain('data-dt="public-verify-form"');
    expect(html).toContain("Book a driving lesson with Alex");
    expect(html).not.toContain("21–27 September 2026");
    expect(html).toContain('aria-label="Booking navigation"');
  });

  it("shows times as information before the email booking step", () => {
    const html = render([{ id: "slot-1", startsAt: "2026-09-28T08:00:00.000Z", endsAt: "2026-09-28T09:00:00.000Z" }]);

    expect(html).toContain('data-dt="public-time-label"');
    expect(html).toContain('data-dt="public-verify-form"');
    expect(html).toContain("Email me a booking link");
    expect(html).not.toContain("Your instructor’s other appointments stay private");
  });
});
