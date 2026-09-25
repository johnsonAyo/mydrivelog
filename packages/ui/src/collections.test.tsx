import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CollectionChooser, CollectionEditor, type CollectionDetail } from "./collections";

const collection: CollectionDetail = {
  id: "list-1",
  name: "Week of 28 September",
  weekStart: "2026-09-28",
  status: "draft",
  slots: [{ id: "time-1", startsAt: "2026-09-28T08:00:00.000Z", endsAt: "2026-09-28T10:00:00.000Z", status: "private" }],
  invitations: [],
  bookings: [],
  generalToken: null,
};

describe("availability list editor", () => {
  it("shows a month of weeks with status and a direct plan-week action", () => {
    const html = renderToStaticMarkup(<CollectionChooser
      weeks={[{ weekStart: "2026-09-28", label: "28 Sep–4 Oct 2026", collection: { id: collection.id, name: collection.name, weekStart: collection.weekStart, status: "draft", updatedAt: "2026-09-25T08:00:00.000Z", slotCount: 1, openCount: 0, bookingCount: 0 }, isPast: false }, { weekStart: "2026-10-05", label: "5–11 Oct 2026", collection: null, isPast: false }]}
      earlierLists={[]}
      monthLabel="October 2026"
      selectedId={collection.id}
      onPreviousMonth={() => {}}
      onNextMonth={() => {}}
      onCreate={async () => {}}
      onSelect={() => {}}
      busy={false}
      error={null}
    />);

    expect(html).toContain("Plan by week");
    expect(html).toContain("October 2026");
    expect(html).toContain("Week 1 · 28 Sep–4 Oct 2026");
    expect(html).toContain("1 time · 0 booked");
    expect(html).toContain("Plan week");
  });

  it("keeps an existing week viewable when creating is unavailable", () => {
    const html = renderToStaticMarkup(<CollectionChooser
      weeks={[{ weekStart: "2026-09-28", label: "28 Sep–4 Oct 2026", collection: { id: collection.id, name: collection.name, weekStart: collection.weekStart, status: "draft", updatedAt: "2026-09-25T08:00:00.000Z", slotCount: 1, openCount: 0, bookingCount: 0 }, isPast: false }, { weekStart: "2026-10-05", label: "5–11 Oct 2026", collection: null, isPast: false }]}
      earlierLists={[]}
      monthLabel="October 2026"
      selectedId={null}
      onPreviousMonth={() => {}}
      onNextMonth={() => {}}
      onCreate={async () => {}}
      onSelect={() => {}}
      busy
      error={null}
    />);

    const weekButtons = [...html.matchAll(/<button[^>]*data-dt="collection-list-item"[^>]*>/g)].map(([button]) => button);
    expect(weekButtons).toHaveLength(2);
    expect(weekButtons[0]).not.toContain("disabled");
    expect(weekButtons[1]).toContain("disabled");
  });

  it("makes adding another time the visible next step and shows saved times beneath the form", () => {
    const html = renderToStaticMarkup(<CollectionEditor
      collection={collection}
      contacts={[]}
      defaultDuration={120}
      defaultGap={30}
      onSaveSlot={async () => true}
      onSetStatus={async () => {}}
      onGenerate={async () => {}}
      onInvite={async () => {}}
      onGeneralLink={async () => {}}
      onPreview={async () => ({ collectionName: "", instructorName: "", timezone: "Europe/London", name: null, kind: "general", slots: [], ownBookings: [] })}
      generalUrl={null}
      lastInvitation={null}
      busy={false}
      error={null}
      notice={null}
    />);

    expect(html).toContain("Add another time");
    expect(html).toContain("Add time to list");
    expect(html).toContain("1 time");
    expect(html).toContain("Or split a wider range into lesson times");
    expect(html.indexOf('data-dt="collection-time-form"')).toBeLessThan(html.indexOf('data-dt="collection-time-list"'));
    expect(html.indexOf('data-dt="collection-time-list"')).toBeLessThan(html.indexOf('data-dt="collection-generator"'));
  });

  it("puts a failed time-save message next to the time entry instead of the sharing controls", () => {
    const html = renderToStaticMarkup(<CollectionEditor
      collection={collection}
      contacts={[]}
      defaultDuration={120}
      defaultGap={30}
      onSaveSlot={async () => false}
      onSetStatus={async () => {}}
      onGenerate={async () => {}}
      onInvite={async () => {}}
      onGeneralLink={async () => {}}
      onPreview={async () => ({ collectionName: "", instructorName: "", timezone: "Europe/London", name: null, kind: "general", slots: [], ownBookings: [] })}
      generalUrl={null}
      lastInvitation={null}
      busy={false}
      error="Could not save this lesson time"
      notice={null}
    />);
    const timeForm = html.slice(html.indexOf('data-dt="collection-time-form"'), html.indexOf('data-dt="collection-generator"'));
    expect(timeForm).toContain('role="alert"');
    expect(timeForm).toContain("Could not save this lesson time");
  });
});
