import type { Metadata } from "next";
import {
  AvailabilityCalendar,
  AvailabilityEditor,
  AvailabilityForm,
  AvailabilityReleaseSummary,
  AvailabilitySlotCard,
  Badge,
  BookingSummaryCard,
  Button,
  DebriefComposer,
  EmptyState,
  EmailAccessForm,
  Inline,
  LessonContextCard,
  ProductShell,
  SchedulingNotice,
  Showcase,
  ShowcaseGrid,
  ShowcaseIntro,
  ShowcaseSection,
  Stack,
  Surface,
  Text,
  TrialNotice,
  TodayTimeline,
} from "@drivetrack/ui";
import { instructorNavigation } from "@/components/instructor-navigation";
import { CollectionEditorPreview } from "@/components/preview/collection-editor-preview";
import { previewCalendarDays, previewCalendarSlots, previewLessons } from "@/components/preview/preview-data";

export const metadata: Metadata = {
  title: "Component lab — MyDriveLog",
  description: "Isolated MyDriveLog product components. Preview data only; not a working instructor workspace.",
  robots: { index: false, follow: false },
};

export default function ComponentLab() {
  return (
    <Showcase>
      <ShowcaseIntro
        title="Build the pieces first."
        description="This is a visual component lab, not a live instructor workspace. The examples below use sample data. Open Calendar for the working availability and booking flow."
      />
      <Inline>
        <a data-dt="button" href="/calendar">Open the live Calendar</a>
      </Inline>

      <ShowcaseSection id="foundation" title="Foundations" description="The same paper, ink, restrained green, and plate-yellow action system used by the landing page.">
        <Surface>
          <Stack gap="5">
            <Inline><Badge tone="brand">Open</Badge><Badge tone="warning">Debrief due</Badge><Badge>Draft</Badge></Inline>
            <Inline>
              <Button disabled>Primary action</Button>
              <Button variant="surface" disabled>Secondary action</Button>
              <Button variant="ghost" disabled>Quiet action</Button>
            </Inline>
            <Text variant="caption">Buttons are disabled here because this gallery does not persist changes.</Text>
          </Stack>
        </Surface>
      </ShowcaseSection>

      <ShowcaseSection id="access" title="Access and pilot" description="Isolated signup and entitlement states. Forms are disabled in this lab; the live flow lives at Get started.">
        <ShowcaseGrid>
          <EmailAccessForm disabled />
          <Stack gap="4">
            <TrialNotice endsAt="2026-10-08T12:00:00.000Z" paidThrough={null} now="2026-09-24T12:00:00.000Z" />
            <TrialNotice endsAt="2026-09-20T12:00:00.000Z" paidThrough={null} now="2026-09-24T12:00:00.000Z" />
          </Stack>
        </ShowcaseGrid>
      </ShowcaseSection>

      <ShowcaseSection id="today" title="A teaching day" description="Lesson status and next-session context are separate, reusable components.">
        <ShowcaseGrid>
          <TodayTimeline lessons={previewLessons} />
          <LessonContextCard
            name="Maya"
            lastLesson="Roundabout positioning; mirror routine was consistent."
            practiceGoals="Choose the approach lane earlier, without prompting."
            privateContext="Begin on a familiar route before the larger roundabout."
            nextFocus="Lane choice and independent approach."
          />
        </ShowcaseGrid>
      </ShowcaseSection>

      <ShowcaseSection id="calendar" title="Calendar and availability" description="State is expressed by label, border, and surface—not colour alone. The editor is isolated from the calendar layout.">
        <AvailabilityCalendar title="21–27 September" days={previewCalendarDays} slots={previewCalendarSlots} />
        <ShowcaseGrid>
          <AvailabilitySlotCard slot={previewCalendarSlots[0]} />
          <AvailabilityEditor
            startValue="2026-09-24T09:00"
            endValue="2026-09-24T11:00"
            footer={<Button disabled>Create slot</Button>}
          />
          <AvailabilityForm disabled />
        </ShowcaseGrid>
      </ShowcaseSection>

      <ShowcaseSection id="release" title="Releases and bookings" description="These are isolated examples of the earlier window model. The live availability-list booking flow is in Calendar.">
        <SchedulingNotice title="Short travel gap" description="Only 20 minutes between these lessons. Your preferred buffer is 30 minutes; you can still continue." />
        <ShowcaseGrid>
          <AvailabilityReleaseSummary
            title="Next week’s openings"
            slotCount={4}
            recipientCount={6}
            bookingAllowance="Unlimited"
            expiresAt="Sunday, 27 September"
            action={<Button disabled>Review release</Button>}
          />
          <BookingSummaryCard
            name="Maya A."
            date="Tuesday, 22 September"
            time="09:00–11:00"
            duration="2 hours"
            state="confirmed"
            action={<Button variant="surface" disabled>Open lesson</Button>}
          />
        </ShowcaseGrid>
      </ShowcaseSection>

      <ShowcaseSection id="debrief" title="Debrief and empty states" description="Shared notes, private context, and the next focus have explicit boundaries before a page or API connects them.">
        <ShowcaseGrid>
          <DebriefComposer
            sharedNotes="Handled familiar roundabouts with more confidence."
            privateNotes="Revisit lane choice before the test route."
            nextFocus="Plan the approach independently."
            footer={<Button disabled>Save debrief</Button>}
          />
          <EmptyState title="No lessons to debrief" description="Completed lessons that still need a debrief will appear here." />
        </ShowcaseGrid>
      </ShowcaseSection>

      <ShowcaseSection id="shell" title="Product shell" description="A composed shell preview, without treating this as an authenticated product page.">
        <ProductShell
          brand="MyDriveLog"
          navigation={instructorNavigation("today")}
          title="Today"
          description="Your lessons and follow-ups in one place."
          identity="Alex"
          actions={<Button disabled>Add availability</Button>}
        >
          <TodayTimeline lessons={previewLessons} />
        </ProductShell>
      </ShowcaseSection>
      <ShowcaseSection id="week-editor" title="Availability week actions" description="Preview and sharing are available directly from a saved week, before opening its lesson-time editor.">
        <CollectionEditorPreview />
      </ShowcaseSection>
    </Showcase>
  );
}
