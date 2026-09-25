"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import type { CalendarSlot } from "./models";
import { Badge, Button, Field, Heading, SelectField, Text } from "./primitives";

const stateLabels: Record<CalendarSlot["state"], string> = {
  draft: "Draft",
  open: "Open",
  booked: "Booked",
  "awaiting-debrief": "Debrief due",
  completed: "Completed",
  unavailable: "Unavailable",
};

export function AvailabilitySlotCard({ slot, action, onOpen }: { slot: CalendarSlot; action?: ReactNode; onOpen?: () => void }) {
  return (
    <article data-dt="availability-slot" data-state={slot.state}>
      <div data-dt="availability-slot-top">
        <time>{slot.startsAt}–{slot.endsAt}</time>
        <Badge tone={slot.state === "open" ? "success" : slot.state === "awaiting-debrief" ? "warning" : "neutral"}>
          {stateLabels[slot.state]}
        </Badge>
      </div>
      {onOpen ? <button type="button" data-dt="slot-open" onClick={onOpen} aria-label={`Open ${slot.label}, ${slot.startsAt} to ${slot.endsAt}`}><strong>{slot.label}</strong><span aria-hidden="true">↗</span></button> : <strong>{slot.label}</strong>}
      {action && <div data-dt="availability-slot-action">{action}</div>}
    </article>
  );
}

export function AvailabilityCalendar({
  title,
  days,
  slots,
  headerAction,
  onSlotOpen,
}: {
  title: string;
  days: readonly { label: string; date: string }[];
  slots: readonly CalendarSlot[];
  headerAction?: ReactNode;
  onSlotOpen?: (id: string) => void;
}) {
  return (
    <section data-dt="availability-calendar" aria-label={title}>
      <header data-dt="calendar-header">
        <div>
          <Text variant="eyebrow">Calendar</Text>
          <Heading as="h2" size="panel">{title}</Heading>
        </div>
        {headerAction}
      </header>
      <p data-dt="calendar-scroll-hint">Swipe across to see the full week.</p>
      <div data-dt="calendar-scroll" role="region" aria-label="Seven-day calendar, scroll horizontally to see the full week" tabIndex={0}>
        <div data-dt="calendar-grid" data-days={days.length}>
          {days.map((day, index) => (
            <section data-dt="calendar-day" key={`${day.label}-${day.date}`} aria-label={`${day.label} ${day.date}`}>
              <header><span>{day.label}</span><strong>{day.date}</strong></header>
              <div data-dt="calendar-day-slots">
                {slots.filter((slot) => slot.day === index).map((slot) => <AvailabilitySlotCard key={slot.id} slot={slot} onOpen={onSlotOpen && slot.state === "open" ? () => onSlotOpen(slot.id) : undefined} />)}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AvailabilityEditor({
  startValue,
  endValue,
  durationHint = "Your default lesson duration is two hours.",
  idPrefix = "availability-slot",
  footer,
}: {
  startValue?: string;
  endValue?: string;
  durationHint?: string;
  idPrefix?: string;
  footer?: ReactNode;
}) {
  const titleId = `${idPrefix}-title`;
  return (
    <section data-dt="availability-editor" aria-labelledby={titleId}>
      <header>
        <Text variant="eyebrow">Availability</Text>
        <Heading as="h2" size="panel" id={titleId}>Create a lesson slot</Heading>
        <Text variant="muted">Choose the time you want to make available. Releasing it to learners is a separate step.</Text>
      </header>
      <div data-dt="editor-fields">
        <Field id={`${idPrefix}-start`} label="Start" type="datetime-local" defaultValue={startValue} />
        <Field id={`${idPrefix}-end`} label="End" type="datetime-local" defaultValue={endValue} hint={durationHint} />
      </div>
      {footer && <footer>{footer}</footer>}
    </section>
  );
}

export function AvailabilityForm({
  onCreate,
  disabled = false,
  defaultSessionMinutes = 120,
  defaultBufferMinutes = 30,
}: {
  onCreate?: (input: { startsAt: string; endsAt: string; sessionMinutes: number; bufferMinutes: number }) => Promise<string | null>;
  disabled?: boolean;
  defaultSessionMinutes?: number;
  defaultBufferMinutes?: number;
}) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const start = String(data.get("start") ?? "");
    const end = String(data.get("end") ?? "");
    const sessionMinutes = Number(data.get("sessionMinutes"));
    const bufferMinutes = Number(data.get("bufferMinutes"));
    const startsAt = new Date(start);
    const endsAt = new Date(end);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt || endsAt.getTime() - startsAt.getTime() < sessionMinutes * 60_000) {
      setMessage("Choose a window long enough for at least one lesson.");
      return;
    }
    if (!onCreate) return;
    setSaving(true);
    setMessage(null);
    try {
      const error = await onCreate({ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), sessionMinutes, bufferMinutes });
      if (error) setMessage(error);
      else {
        form.reset();
        setMessage("Availability window created. Open it in the calendar to share booking links.");
      }
    } catch {
      setMessage("Could not save the slot. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form data-dt="availability-editor" onSubmit={submit}>
      <header>
        <div>
          <Text variant="eyebrow">Availability</Text>
          <Heading as="h2" size="panel">Create availability</Heading>
          <Text variant="muted">Choose a window for several lessons. Times use your device’s time zone; sharing happens after you create it.</Text>
        </div>
      </header>
      <div data-dt="editor-fields">
        <Field id="new-slot-start" name="start" label="Window starts" type="datetime-local" required disabled={disabled || saving} />
        <Field id="new-slot-end" name="end" label="Window ends" type="datetime-local" required disabled={disabled || saving} />
        <SelectField id="new-slot-duration" name="sessionMinutes" label="Lesson length" defaultValue={defaultSessionMinutes} key={`duration-${defaultSessionMinutes}`} disabled={disabled || saving}>
          {[30, 45, 60, 90, 120, 150, 180, 240].map((minutes) => <option key={minutes} value={minutes}>{minutes < 60 ? `${minutes} minutes` : `${minutes / 60} hours`}</option>)}
        </SelectField>
        <SelectField id="new-slot-buffer" name="bufferMinutes" label="Travel buffer between bookings" defaultValue={defaultBufferMinutes} key={`buffer-${defaultBufferMinutes}`} disabled={disabled || saving}>
          {[0, 15, 30, 45, 60].map((minutes) => <option key={minutes} value={minutes}>{minutes === 0 ? "No buffer" : `${minutes} minutes`}</option>)}
        </SelectField>
      </div>
      <footer><Button type="submit" disabled={disabled || saving}>{saving ? "Saving…" : "Create availability"}</Button>{message && <p data-dt="form-feedback" role="status">{message}</p>}</footer>
    </form>
  );
}
