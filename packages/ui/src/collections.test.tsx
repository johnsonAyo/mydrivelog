import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CollectionChooser, CollectionEditor, type CollectionDetail } from "./collections";

const collection: CollectionDetail = {
  id: "list-1",
  name: "Week of 28 September",
  status: "draft",
  slots: [{ id: "time-1", startsAt: "2026-09-28T08:00:00.000Z", endsAt: "2026-09-28T10:00:00.000Z", status: "private" }],
  invitations: [],
  bookings: [],
  generalToken: null,
};

describe("availability list editor", () => {
  it("keeps creating another draft secondary once a list exists", () => {
    const html = renderToStaticMarkup(<CollectionChooser
      collections={[{ id: collection.id, name: collection.name, status: "draft", updatedAt: "2026-09-25T08:00:00.000Z", slotCount: 1, openCount: 0, bookingCount: 0 }]}
      selectedId={collection.id}
      defaultName="Week of 28 September"
      onCreate={async () => {}}
      onSelect={() => {}}
      busy={false}
      error={null}
    />);

    expect(html).toContain("Your time lists");
    expect(html).toContain('<details data-dt="collection-create-more"');
    expect(html).toContain("Create another list");
    expect(html.indexOf('data-dt="collection-list"')).toBeLessThan(html.indexOf('data-dt="collection-new-form"'));
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
