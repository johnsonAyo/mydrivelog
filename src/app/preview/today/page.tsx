import type { Metadata } from "next";
import { BookingSummaryCard, Button, LessonContextCard, Stack, TodayTimeline } from "@drivetrack/ui";
import { previewLessons } from "@/components/preview/preview-data";
import { PreviewProductShell } from "@/components/preview/preview-product-shell";

export const metadata: Metadata = {
  title: "Today preview — DriveTrack",
  robots: { index: false, follow: false },
};

export default function TodayPreviewPage() {
  return (
    <PreviewProductShell page="today" title="Today" description="Your lessons and follow-ups in one place.">
      <TodayTimeline lessons={previewLessons} />
      <Stack gap="4">
        <LessonContextCard
          name="Maya"
          lastLesson="Roundabout positioning; mirror routine was consistent."
          practiceGoals="Choose the approach lane earlier, without prompting."
          privateContext="Begin on a familiar route before the larger roundabout."
          nextFocus="Lane choice and independent approach."
        />
        <BookingSummaryCard
          name="Maya A."
          date="Thursday, 24 September"
          time="09:00–11:00"
          duration="2 hours"
          state="confirmed"
          action={<Button variant="surface" disabled>Open lesson</Button>}
        />
      </Stack>
    </PreviewProductShell>
  );
}
