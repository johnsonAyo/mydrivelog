import type { Metadata } from "next";
import { AvailabilityCalendar, AvailabilityForm, Badge } from "@drivetrack/ui";
import { previewCalendarDays, previewCalendarSlots } from "@/components/preview/preview-data";
import { PreviewProductShell } from "@/components/preview/preview-product-shell";

export const metadata: Metadata = {
  title: "Calendar preview — DriveTrack",
  robots: { index: false, follow: false },
};

export default function CalendarPreviewPage() {
  return (
    <PreviewProductShell page="calendar" title="Your calendar" description="Plan your teaching week and create lesson slots.">
      <AvailabilityCalendar
        title="21–27 September"
        days={previewCalendarDays}
        slots={previewCalendarSlots}
        headerAction={<Badge tone="brand">Sample week</Badge>}
      />
      <AvailabilityForm disabled />
    </PreviewProductShell>
  );
}
