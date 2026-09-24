import type { Metadata } from "next";
import { CalendarDays, Clock3 } from "lucide-react";
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
  type CalendarSlot,
  type TimelineLesson,
} from "@drivetrack/ui";

export const metadata: Metadata = {
  title: "Component lab — DriveTrack",
  description: "Isolated DriveTrack product components. Preview data only; not a working instructor workspace.",
  robots: { index: false, follow: false },
};

const calendarDays = [
  { label: "Monday", date: "21" },
  { label: "Tuesday", date: "22" },
  { label: "Wednesday", date: "23" },
  { label: "Thursday", date: "24" },
  { label: "Friday", date: "25" },
  { label: "Saturday", date: "26" },
  { label: "Sunday", date: "27" },
];

const slots: CalendarSlot[] = [
  { id: "monday-am", day: 0, startsAt: "09:00", endsAt: "11:00", label: "Available lesson", state: "open" },
  { id: "tuesday-am", day: 1, startsAt: "09:00", endsAt: "11:00", label: "Maya A.", state: "booked" },
  { id: "tuesday-pm", day: 1, startsAt: "14:00", endsAt: "16:00", label: "Open lesson", state: "open" },
  { id: "wednesday-am", day: 2, startsAt: "10:00", endsAt: "12:00", label: "Owen P.", state: "awaiting-debrief" },
  { id: "thursday-pm", day: 3, startsAt: "13:00", endsAt: "15:00", label: "Draft lesson slot", state: "draft" },
  { id: "friday-am", day: 4, startsAt: "09:30", endsAt: "11:30", label: "Sofia R.", state: "completed" },
];

const lessons: TimelineLesson[] = [
  { id: "maya", time: "09:00", name: "Maya A.", detail: "Roundabouts · Lesson 8", state: "upcoming" },
  { id: "owen", time: "11:30", name: "Owen P.", detail: "Dual carriageways · Lesson 12", state: "awaiting-debrief" },
  { id: "sofia", time: "14:00", name: "Sofia R.", detail: "Bay parking · Lesson 5", state: "completed" },
];

export default function ComponentLab() {
  return (
    <Showcase>
      <ShowcaseIntro
        title="Build the pieces first."
        description="This is a visual component lab, not a live instructor workspace. Calendar, lesson, and debrief examples below use sample data; only availability has a migrated API at this milestone."
      />

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

      <ShowcaseSection id="access" title="Access and trial" description="Isolated signup and entitlement states. Forms are disabled in this lab; the live flow lives at Get started.">
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
          <TodayTimeline lessons={lessons} />
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
        <AvailabilityCalendar title="21–27 September" days={calendarDays} slots={slots} />
        <ShowcaseGrid>
          <AvailabilitySlotCard slot={slots[0]} />
          <AvailabilityEditor
            startValue="2026-09-24T09:00"
            endValue="2026-09-24T11:00"
            footer={<Button disabled>Create slot</Button>}
          />
          <AvailabilityForm disabled />
        </ShowcaseGrid>
      </ShowcaseSection>

      <ShowcaseSection id="release" title="Releases and bookings" description="A release previews exactly what is selected. Booking and buffer feedback stay distinct from calendar layout; these use sample data until their workflows exist.">
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
          brand="DriveTrack"
          navigation={[
            { href: "#today", label: "Today", icon: <Clock3 size={17} />, active: true },
            { href: "#calendar", label: "Calendar", icon: <CalendarDays size={17} /> },
          ]}
          title="Today"
          description="Your lessons and follow-ups in one place."
          identity="Independent instructor workspace"
          actions={<Button disabled>Add availability</Button>}
        >
          <TodayTimeline lessons={lessons} />
        </ProductShell>
      </ShowcaseSection>
    </Showcase>
  );
}
