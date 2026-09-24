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
| Availability | AvailabilitySlotCard, AvailabilityCalendar, AvailabilityEditor, AvailabilityForm | Isolated examples and live Calendar binding |
| Operations | SchedulingNotice, AvailabilityReleaseSummary, BookingSummaryCard | Isolated previews; release and booking endpoints not built |
| Teaching day | TodayTimeline, LessonContextCard | Isolated preview data |
| Debrief | DebriefComposer | Isolated preview data; backend not built |
| Catalog | Showcase wrappers | Lab only |

## Next component slices before pages

As backend workflows are built and approved, extend the lab with real state variants: loading, validation, conflict, warning, empty, and success. Booking and lesson-context components need a confirmed data contract before they are wired to APIs. Compose real routes after those contracts and their tests exist; avoid suggesting the current lab is a product dashboard.
