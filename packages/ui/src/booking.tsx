"use client";

import { useState, type FormEvent } from "react";
import { Button, Field, Heading, LoadingRegion, SelectField, Skeleton, Stack, Text } from "./primitives";

export type SchedulingSettings = {
  name: string;
  timezone: string;
  defaultSessionMinutes: number;
  bufferWarningMinutes: number;
  weeklyBookingAllowance: "unlimited" | "one" | "two" | "three" | "four" | "five";
  minimumBookingNoticeHours: 0 | 12 | 24 | 48;
  contactPhone: string | null;
};

const lengths = [30, 45, 60, 90, 120, 150, 180, 240];
const buffers = [0, 15, 30, 45, 60];
type EditableSchedulingSettings = Pick<SchedulingSettings, "defaultSessionMinutes" | "bufferWarningMinutes" | "weeklyBookingAllowance" | "minimumBookingNoticeHours" | "contactPhone">;

export function SchedulingSettingsForm({ settings, onSave }: {
  settings: SchedulingSettings;
  onSave: (input: EditableSchedulingSettings) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaving(true);
    await onSave({
      defaultSessionMinutes: Number(data.get("duration")),
      bufferWarningMinutes: Number(data.get("buffer")),
      weeklyBookingAllowance: String(data.get("allowance")) as SchedulingSettings["weeklyBookingAllowance"],
      minimumBookingNoticeHours: Number(data.get("notice")) as SchedulingSettings["minimumBookingNoticeHours"],
      contactPhone: String(data.get("phone") ?? "").trim() || null,
    }).catch(() => {});
    setSaving(false);
  }
  return <form data-dt="booking-panel" onSubmit={submit}>
    <header><Text variant="eyebrow">Scheduling rules</Text><Heading as="h2" size="panel">Your booking defaults</Heading><Text variant="muted">Lesson length and travel buffer guide new times. Existing times stay as you saved them.</Text></header>
    <div data-dt="booking-fields">
      <SelectField id="setting-duration" name="duration" label="Lesson length" defaultValue={settings.defaultSessionMinutes}>
        {lengths.map((value) => <option key={value} value={value}>{value === 30 ? "½ hour" : value === 45 ? "¾ hour" : `${value / 60} ${value === 60 ? "hour" : "hours"}`}</option>)}
      </SelectField>
      <SelectField id="setting-buffer" name="buffer" label="Travel buffer" defaultValue={settings.bufferWarningMinutes} hint="Warns you when new times are close together. It never hides a time you deliberately share.">
        {buffers.map((value) => <option key={value} value={value}>{value === 0 ? "No buffer" : `${value} minutes`}</option>)}
      </SelectField>
      <SelectField id="setting-allowance" name="allowance" label="Online bookings per learner each week" defaultValue={settings.weeklyBookingAllowance} hint="Applies to booking links; it does not block you from scheduling manually.">
        <option value="one">One lesson</option><option value="two">Two lessons</option><option value="three">Three lessons</option><option value="four">Four lessons</option><option value="five">Five lessons</option><option value="unlimited">No limit</option>
      </SelectField>
      <SelectField id="setting-notice" name="notice" label="Minimum booking notice" defaultValue={settings.minimumBookingNoticeHours} hint="Applies immediately to future online bookings; it does not change your saved times.">
        <option value="0">No minimum</option><option value="12">12 hours</option><option value="24">24 hours</option><option value="48">48 hours</option>
      </SelectField>
      <Field id="setting-phone" name="phone" type="tel" label="Contact phone (optional)" defaultValue={settings.contactPhone ?? ""} hint="Shown to a learner who needs to change a lesson within 48 hours." />
    </div>
    <footer><Button type="submit" loading={saving}>Save settings</Button></footer>
  </form>;
}

export function SchedulingSettingsSkeleton() {
  return <LoadingRegion label="Loading scheduling settings"><div data-dt="booking-panel">
    <header><Skeleton width="quarter" /><Skeleton shape="heading" width="third" /><Skeleton width="two-thirds" /></header>
    <div data-dt="booking-fields">{[0, 1, 2, 3].map((field) => <Stack key={field} gap="2"><Skeleton width="third" /><Skeleton shape="control" /></Stack>)}</div>
    <footer><Skeleton shape="button" /></footer>
  </div></LoadingRegion>;
}
