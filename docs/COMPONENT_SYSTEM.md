# Product component system

The component lab at `/component-lab` is the visual inventory. It uses inert actions and sample data; `/calendar` is the real, database-backed Calendar. This keeps visual examples separate from functioning workflows.

## Discipline

- Component variants, spacing, tone, and size are explicit typed props. Product call sites do not use `className`, inline styles, or raw colour values.
- Component CSS is owned by `src/app/globals.css` under `data-dt` selectors; tokens are in `packages/tokens/src/tokens.css`. Marketing selectors remain scoped to `.landing-page`.
- Product components are presentational and reusable. View-model mapping, loading/error state, mutations, and authorisation belong to routes or application adapters, not the visual package.
- Yellow marks primary or active actions; deep green supplies structure and detail; paper/ink carry most content. Status is also shown with text and borders, never colour alone.
- `npm run guard:css` and `npm run guard:styles` catch extra stylesheets and styling escapes in the new product surface.

## Inventory

| Layer | Components | State today |
| --- | --- | --- |
| Foundations | Container, Stack, Inline, Surface, Heading, Text, Button, Badge, Field, TextareaField, EmptyState | Isolated, prop-driven |
| Navigation | ProductShell | Reused in the real Calendar |
| Availability | CollectionChooser, CollectionEditor, PublicCollectionPicker | Prop-driven views used by the live collection and public-booking routes |
| Legacy availability | AvailabilitySlotCard, AvailabilityCalendar, AvailabilityEditor, AvailabilityForm | Isolated examples of the earlier window model; no longer the main editor |
| Operations | SchedulingNotice, AvailabilityReleaseSummary, BookingSummaryCard | Isolated previews; earlier release and booking endpoints exist |
| Teaching day | TodayTimeline, LessonContextCard | Isolated preview data |
| Debrief | DebriefComposer | Isolated preview data; backend not built |
| Catalog | Showcase wrappers | Lab only |

## Interaction contract

The list editor keeps the common path visible: name a list, add one lesson time, repeat within the same list, then share. The saved times appear directly below the entry form; after a save the date stays selected and the next start time receives focus. Date and time controls offer future, half-hour choices with inline guidance; an exact-minute disclosure handles irregular times. The range generator sits below the saved list as a secondary tool for splitting a wider window into lessons. Scheduling defaults prefill duration and gap but do not prevent editing an individual time. A shared collection can still receive private times, which require an explicit “Make available” action. Booked entries display the recipient and cannot be moved by the slot editor. Public booking displays only currently available times and the recipient's own confirmed lessons. The view components do not fetch or mutate; client adapters own those concerns.

## Next component slices before pages

As backend workflows are built and approved, extend the lab with real state variants: loading, validation, conflict, warning, empty, and success. Booking and lesson-context components need a confirmed data contract before they are wired to APIs. Compose real routes after those contracts and their tests exist; avoid suggesting the current lab is a product dashboard.
