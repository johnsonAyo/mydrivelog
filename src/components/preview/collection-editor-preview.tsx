"use client";

import { CollectionChooser, CollectionEditor } from "@drivetrack/ui";

export function CollectionEditorPreview() {
  return <div className="grid gap-5"><CollectionChooser
    weeks={[{ weekStart: "2026-09-28", label: "28 Sep–4 Oct 2026", collection: { id: "sample-week", name: "Week of 28 September", weekStart: "2026-09-28", status: "draft", updatedAt: "2026-09-25T08:00:00.000Z", slotCount: 0, openCount: 0, bookingCount: 0 }, isPast: false }]}
    monthLabel="September 2026"
    selectedId="sample-week"
    onPreviousMonth={() => {}}
    onNextMonth={() => {}}
    onCreate={async () => {}}
    onSelect={() => {}}
    previewHref={() => "#week-editor"}
    shareHref={() => "#week-editor"}
    busy
    error={null}
  /><CollectionEditor
    collection={{ id: "sample-week", name: "Week of 28 September", weekStart: "2026-09-28", status: "draft", slots: [], invitations: [], bookings: [], generalToken: null }}
    defaultDuration={120}
    defaultGap={30}
    onSaveSlot={async () => false}
    onSetStatus={async () => {}}
    onGenerate={async () => {}}
    busy
    error={null}
    notice={null}
  /></div>;
}
