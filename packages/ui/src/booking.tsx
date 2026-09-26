"use client";

import { useState, type FormEvent } from "react";
import { Badge, Button, Field, Heading, SelectField, Text } from "./primitives";

export type SchedulingSettings = {
  name: string;
  timezone: string;
  defaultSessionMinutes: number;
  bufferWarningMinutes: number;
  weeklyBookingAllowance: "unlimited" | "one" | "two" | "three" | "four" | "five";
  minimumBookingNoticeHours: 0 | 12 | 24 | 48;
  contactPhone: string | null;
};

export type WindowDetail = {
  id: string;
  startsAt: string;
  endsAt: string;
  sessionMinutes: number;
  bufferMinutes: number;
  status: string;
  releases: { id: string; status: string; recipientCount: number; expiresAt: string }[];
  bookings: { id: string; startsAt: string; endsAt: string; name: string; email: string; confirmationEmailStatus: string }[];
};

export type ReleasedLink = { name: string; email: string; url: string; emailStatus: string };

function localInput(iso: string) {
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function readable(iso: string, timezone?: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(iso));
}

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
    <footer><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save settings"}</Button></footer>
  </form>;
}

export function AvailabilityWindowPanel({ detail, links, onEdit, onRelease, onClose }: {
  detail: WindowDetail;
  links: ReleasedLink[];
  onEdit: (input: { startsAt: string; endsAt: string; sessionMinutes: number; bufferMinutes: number; revokePublished: boolean }) => Promise<string | null>;
  onRelease: (input: { recipients: { name: string; email: string }[]; sendEmail: boolean }) => Promise<string | null>;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [recipients, setRecipients] = useState([{ name: "", email: "" }]);
  const [sendEmail, setSendEmail] = useState(true);
  const published = detail.releases.some((release) => release.status === "published");
  async function edit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const start = new Date(String(data.get("start")));
    const end = new Date(String(data.get("end")));
    const sessionMinutes = Number(data.get("duration"));
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end.getTime() - start.getTime() < sessionMinutes * 60_000) { setMessage("The window must fit at least one complete lesson."); return; }
    setSaving(true);
    const error = await onEdit({ startsAt: start.toISOString(), endsAt: end.toISOString(), sessionMinutes, bufferMinutes: Number(data.get("buffer")), revokePublished: published }).catch(() => "Could not update this availability.");
    setMessage(error ?? (published ? "Window updated. Previously shared links are now revoked; share new links below." : "Window updated."));
    if (!error) setEditing(false);
    setSaving(false);
  }
  async function release(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selected = recipients.map((recipient) => ({ name: recipient.name.trim(), email: recipient.email.trim().toLowerCase() }));
    if (selected.some((recipient) => !recipient.name || !recipient.email)) { setMessage("Add a name and email for each learner."); return; }
    setSaving(true);
    const error = await onRelease({ recipients: selected, sendEmail }).catch(() => "Could not share this window.");
    setMessage(error ?? (sendEmail ? "Links created. Check each email status below." : "Links created. Copy them below to share."));
    setSaving(false);
  }
  return <section data-dt="booking-panel" aria-label="Availability details">
    <header data-dt="booking-panel-heading"><div><Text variant="eyebrow">Availability details</Text><Heading as="h2" size="panel">{readable(detail.startsAt)} – {new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(detail.endsAt))}</Heading><Text variant="muted">{detail.sessionMinutes} minute lessons · {detail.bufferMinutes} minute travel buffer</Text></div><Button type="button" variant="surface" size="2" onClick={onClose}>Close</Button></header>
    {detail.bookings.length > 0 && <div data-dt="booking-block"><Heading as="h3" size="small">Confirmed lessons</Heading><ul data-dt="booking-list">{detail.bookings.map((booking) => <li key={booking.id}><strong>{readable(booking.startsAt)} — {booking.name}</strong><span>{booking.email}</span><Badge tone="warning">Booked</Badge></li>)}</ul></div>}
    <div data-dt="booking-block"><div data-dt="booking-block-heading"><Heading as="h3" size="small">Window rules</Heading><Button type="button" variant="surface" size="2" onClick={() => setEditing(!editing)} disabled={detail.bookings.length > 0}>{editing ? "Cancel" : "Edit window"}</Button></div>
      {detail.bookings.length > 0 && <Text variant="caption">This window has a confirmed lesson, so its times cannot be moved.</Text>}
      {editing && <form onSubmit={edit}><div data-dt="booking-fields"><Field id="edit-start" name="start" type="datetime-local" label="Window starts" defaultValue={localInput(detail.startsAt)} required /><Field id="edit-end" name="end" type="datetime-local" label="Window ends" defaultValue={localInput(detail.endsAt)} required /><SelectField id="edit-duration" name="duration" label="Lesson length" defaultValue={detail.sessionMinutes}>{lengths.map((value) => <option key={value} value={value}>{value} minutes</option>)}</SelectField><SelectField id="edit-buffer" name="buffer" label="Travel buffer" defaultValue={detail.bufferMinutes}>{buffers.map((value) => <option key={value} value={value}>{value} minutes</option>)}</SelectField></div>{published && <p data-dt="booking-caution">Saving changes will revoke existing booking links. You can share fresh links afterwards.</p>}<Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save window"}</Button></form>}
    </div>
    <div data-dt="booking-block"><Heading as="h3" size="small">Share booking links</Heading><Text variant="muted">Each learner receives their own private link and can choose one available time. You can send email or copy links manually.</Text>
      <form onSubmit={release} data-dt="release-form"><div data-dt="recipient-list">{recipients.map((recipient, index) => <div data-dt="recipient-row" key={index}><Field id={`recipient-${index}-name`} label="Learner name" type="text" value={recipient.name} required onChange={(event) => setRecipients((current) => current.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} /><Field id={`recipient-${index}-email`} label="Email address" type="email" value={recipient.email} required onChange={(event) => setRecipients((current) => current.map((item, i) => i === index ? { ...item, email: event.target.value } : item))} />{recipients.length > 1 && <Button type="button" size="2" variant="ghost" onClick={() => setRecipients((current) => current.filter((_, i) => i !== index))}>Remove</Button>}</div>)}</div><div data-dt="release-actions"><Button type="button" variant="surface" size="2" onClick={() => setRecipients((current) => [...current, { name: "", email: "" }])} disabled={recipients.length >= 30}>Add learner</Button><label data-dt="checkbox"><input type="checkbox" checked={sendEmail} onChange={(event) => setSendEmail(event.target.checked)} /> Send invitation email</label><Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create booking links"}</Button></div></form>
      {detail.releases.length > 0 && <Text variant="caption">{detail.releases.filter((release) => release.status === "published").length} active release{detail.releases.filter((release) => release.status === "published").length === 1 ? "" : "s"}. Links stop working when the window closes or the link expires.</Text>}
      {links.length > 0 && <ul data-dt="booking-list">{links.map((link) => <li key={link.url}><strong>{link.name}</strong><span>{link.email} · {link.emailStatus === "sent" ? "Email sent" : link.emailStatus === "not_configured" ? "Email not configured — copy this link" : link.emailStatus === "failed" ? "Email failed — copy this link" : "Share manually"}</span><a href={link.url} target="_blank" rel="noreferrer">Open link</a><Button type="button" size="2" variant="surface" onClick={() => void navigator.clipboard.writeText(link.url).then(() => setMessage(`Copied ${link.name}’s link.`)).catch(() => setMessage("Copy failed. Open the link and copy its address."))}>Copy link</Button></li>)}</ul>}
    </div>
    {message && <p data-dt="form-feedback" role="status">{message}</p>}
  </section>;
}

export type PublicBooking = { recipientName: string; instructorName: string; timezone: string; sessionMinutes: number; bufferMinutes: number; options: string[]; alreadyBooked: { startsAt: string; endsAt: string } | null };

export function PublicBookingPicker({ booking, onBook }: { booking: PublicBooking; onBook: (startsAt: string) => Promise<{ error: string | null; confirmationEmailStatus?: string }> }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  async function book() {
    if (!selected) return;
    setSaving(true);
    const result: { error: string | null; confirmationEmailStatus?: string } = await onBook(selected).catch(() => ({ error: "Could not confirm your lesson. Please try again." }));
    setMessage(result.error ?? (result.confirmationEmailStatus === "sent"
      ? "Your lesson is confirmed. A confirmation email has been sent."
      : "Your lesson is confirmed and visible to your instructor. Email confirmation is not available yet; keep this link for the details."));
    setConfirmed(!result.error);
    setSaving(false);
  }
  return <section data-dt="public-booking"><header><Text variant="eyebrow">MyDriveLog · lesson booking</Text><Heading as="h1" size="section">Choose your lesson time.</Heading><Text variant="muted">{booking.instructorName} has shared these times with you, {booking.recipientName}. Each lesson lasts {booking.sessionMinutes} minutes.</Text></header>
    {booking.alreadyBooked || confirmed ? <div data-dt="booking-block"><Badge tone="warning">Confirmed</Badge><Heading as="h2" size="panel">Your lesson is booked</Heading><Text>{readable(booking.alreadyBooked?.startsAt ?? selected ?? "", booking.timezone)}</Text><Text variant="muted">Time zone: {booking.timezone}. Keep this link for your booking details.</Text></div> : <div data-dt="booking-block"><Heading as="h2" size="panel">Available times</Heading><Text variant="muted">All times shown in {booking.timezone}. A {booking.bufferMinutes}-minute travel buffer is included between lessons.</Text>{booking.options.length > 0 ? <><div data-dt="time-options">{booking.options.map((option) => <button key={option} type="button" data-dt="time-option" aria-pressed={selected === option} onClick={() => setSelected(option)}>{readable(option, booking.timezone)}</button>)}</div><Button type="button" onClick={() => void book()} disabled={!selected || saving}>{saving ? "Confirming…" : "Confirm lesson"}</Button></> : <Text>No times remain in this window. Ask your instructor for a new link.</Text>}</div>}
    {message && <p data-dt="form-feedback" role="status">{message}</p>}
  </section>;
}
