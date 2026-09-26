"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Badge, Button, EmptyState, Field, Heading, SelectField, Text } from "./primitives";
import { LessonTimePicker, lessonTimeIssue } from "./lesson-time-picker";

export type CollectionSummary = { id: string; name: string; weekStart: string | null; status: "draft" | "live"; updatedAt: string; slotCount: number; openCount: number; bookingCount: number };
export type CollectionDetail = { id: string; name: string; weekStart: string | null; status: "draft" | "live"; slots: CollectionSlot[]; invitations: CollectionInvitation[]; bookings: CollectionBooking[]; generalToken: string | null };
export type CollectionWeek = { weekStart: string; label: string; collection: CollectionSummary | null; isPast: boolean };
export type CollectionSlot = { id: string; startsAt: string; endsAt: string; status: "private" | "open" | "booked" | "closed" };
export type CollectionInvitation = { id: string; name: string; email: string; emailStatus: string };
export type CollectionBooking = { id: string; slotId: string; name: string; email: string; startsAt: string; endsAt: string; confirmationEmailStatus: string };
export type ContactOption = { name: string; email: string };
export type SlotInput = { startsAt: string; endsAt: string; makeAvailable: boolean };
export type CollectionFeedbackArea = "time" | "generator" | "list" | "share";

function localDateTime(value: string) {
  const date = new Date(value);
  const digits = (number: number) => String(number).padStart(2, "0");
  return { date: `${date.getFullYear()}-${digits(date.getMonth() + 1)}-${digits(date.getDate())}`, time: `${digits(date.getHours())}:${digits(date.getMinutes())}` };
}

function displayTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(new Date(value));
}

function lessonLength(value: number) {
  if (value === 30) return "½ hour";
  if (value === 45) return "¾ hour";
  const hours = value / 60;
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

function lastDayOfWeek(weekStart: string) {
  const date = new Date(`${weekStart}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 6);
  return date.toISOString().slice(0, 10);
}

export function CollectionChooser({ weeks, earlierLists, monthLabel, selectedId, onPreviousMonth, onNextMonth, onCreate, onSelect, busy, error }: {
  weeks: readonly CollectionWeek[]; earlierLists: readonly CollectionSummary[]; monthLabel: string; selectedId: string | null;
  onPreviousMonth: () => void; onNextMonth: () => void; onCreate: (weekStart: string) => Promise<void>; onSelect: (id: string) => void; busy: boolean; error: string | null;
}) {
  return <section data-dt="collection-chooser">
    <div data-dt="collection-section-heading"><div><Text variant="eyebrow">YOUR AVAILABILITY</Text><Heading as="h2" size="panel">Plan by week</Heading><Text variant="muted">Pick a week, add your lesson times, and share when you are ready. You can return to any draft.</Text></div></div>
    <div data-dt="collection-month-nav"><Button type="button" variant="ghost" onClick={onPreviousMonth} aria-label="Previous month">←</Button><strong>{monthLabel}</strong><Button type="button" variant="ghost" onClick={onNextMonth} aria-label="Next month">→</Button></div>
    <div data-dt="collection-list" aria-label="Weeks in this month">{weeks.map((week, index) => {
      const collection = week.collection;
      return <button key={week.weekStart} type="button" data-dt="collection-list-item" aria-current={collection && selectedId === collection.id ? "true" : undefined} disabled={!collection && (busy || week.isPast)} onClick={() => collection ? onSelect(collection.id) : void onCreate(week.weekStart)}>
        <span><strong>Week {index + 1} · {week.label}</strong><small>{collection ? `${collection.slotCount} ${collection.slotCount === 1 ? "time" : "times"} · ${collection.bookingCount} booked` : week.isPast ? "No list for this week" : "No times added yet"}</small></span>
        {collection ? <Badge tone={collection.status === "live" ? "success" : "neutral"}>{collection.status === "live" ? "Shared" : "Draft"}</Badge> : <span data-dt="collection-week-action">{week.isPast ? "Past week" : "Plan week →"}</span>}
      </button>;
    })}</div>
    {error && <p data-dt="collection-feedback" role="alert">{error}</p>}
    {earlierLists.length > 0 && <details data-dt="collection-create-more"><summary>Earlier lists ({earlierLists.length})</summary><div data-dt="collection-list" aria-label="Earlier availability lists">{earlierLists.map((collection) => <button key={collection.id} type="button" data-dt="collection-list-item" aria-current={selectedId === collection.id ? "true" : undefined} onClick={() => onSelect(collection.id)}><span><strong>{collection.name}</strong><small>{collection.slotCount} {collection.slotCount === 1 ? "time" : "times"} · {collection.bookingCount} booked</small></span><Badge tone={collection.status === "live" ? "success" : "neutral"}>{collection.status === "live" ? "Shared" : "Draft"}</Badge></button>)}</div></details>}
  </section>;
}

export function CollectionEditor({ collection, contacts, defaultDuration, defaultGap, onSaveSlot, onSetStatus, onGenerate, onInvite, onGeneralLink, onPreview, onChangeBooking, lessonHref, generalUrl, lastInvitation, busy, error, notice, errorArea = "time", noticeArea = "share" }: {
  collection: CollectionDetail; contacts: readonly ContactOption[]; defaultDuration: number; defaultGap: number;
  onSaveSlot: (input: SlotInput, id?: string) => Promise<boolean>; onSetStatus: (slotId: string, status: "private" | "open" | "closed") => Promise<void>;
  onGenerate: (input: { date: string; from: string; to: string; duration: number; gap: number }) => Promise<void>;
  onInvite: (name: string, email: string) => Promise<void>; onGeneralLink: () => Promise<void>;
  onPreview: (kind: "invitation" | "general") => Promise<PublicCollection>;
  onChangeBooking?: (bookingId: string, action: "cancel" | "reschedule", slotId?: string) => Promise<void>;
  lessonHref?: (bookingId: string) => string;
  generalUrl: string | null; lastInvitation: { url: string; emailStatus: string } | null; busy: boolean; error: string | null; notice: string | null;
  errorArea?: CollectionFeedbackArea | null; noticeArea?: CollectionFeedbackArea | null;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [now, setNow] = useState<Date | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [rangeDate, setRangeDate] = useState("");
  const [rangeFrom, setRangeFrom] = useState("09:00");
  const [rangeTo, setRangeTo] = useState("17:00");
  const [rangeDuration, setRangeDuration] = useState(defaultDuration);
  const [rangeGap, setRangeGap] = useState(defaultGap);
  const [contact, setContact] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState<PublicCollection | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [changingBookingId, setChangingBookingId] = useState<string | null>(null);
  const [replacementSlotId, setReplacementSlotId] = useState("");
  async function showPreview(kind: "invitation" | "general") {
    setPreviewError(null);
    try { setPreview(await onPreview(kind)); } catch { setPreviewError("Could not load the preview. Try again."); }
  }

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const interval = window.setInterval(tick, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  function resetForm(keepDate = false) { setEditingId(null); if (!keepDate) setDate(""); setStart(""); setEnd(""); setLocalError(null); }
  function edit(slot: CollectionSlot) {
    const from = localDateTime(slot.startsAt);
    const to = localDateTime(slot.endsAt);
    setEditingId(slot.id); setDate(from.date); setStart(from.time); setEnd(to.time); setLocalError(null);
    document.getElementById("collection-time-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function moveStart(next: string) {
    if (date && start && end && next) {
      const priorStart = new Date(`${date}T${start}`);
      const priorEnd = new Date(`${date}T${end}`);
      const nextStart = new Date(`${date}T${next}`);
      const movedEnd = new Date(nextStart.getTime() + (priorEnd.getTime() - priorStart.getTime()));
      setEnd(localDateTime(movedEnd.toISOString()).time);
    }
    setStart(next);
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!date || !start) return;
    const issue = lessonTimeIssue({ date, start, end, defaultDuration, weekStart: collection.weekStart }, new Date());
    if (issue) { setLocalError(issue); return; }
    setLocalError(null);
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const begins = new Date(`${date}T${start}`);
    const finishes = end ? new Date(`${date}T${end}`) : new Date(begins.getTime() + defaultDuration * 60_000);
    const saved = await onSaveSlot({ startsAt: begins.toISOString(), endsAt: finishes.toISOString(), makeAvailable: submitter?.value === "open" }, editingId ?? undefined);
    if (saved) {
      resetForm(true);
      document.getElementById("lesson-start")?.focus();
    }
  }
  async function invite(event: FormEvent) {
    event.preventDefault();
    if (inviteName.trim() && inviteEmail.trim()) await onInvite(inviteName.trim(), inviteEmail.trim());
  }
  async function copy(url: string) {
    await navigator.clipboard.writeText(new URL(url, window.location.origin).toString());
    setCopied(true);
  }
  const groups = new Map<string, CollectionSlot[]>();
  for (const slot of collection.slots) {
    const day = localDateTime(slot.startsAt).date;
    groups.set(day, [...(groups.get(day) ?? []), slot]);
  }
  const link = generalUrl ?? (collection.generalToken ? `/book/availability/${collection.generalToken}` : null);
  const hasSharableTimes = collection.slots.some((slot) => (slot.status === "open" || (collection.status === "draft" && slot.status === "private")) && new Date(slot.startsAt) > new Date());
  const renewingInvitation = collection.invitations.some((invite) => invite.email.toLowerCase() === inviteEmail.trim().toLowerCase());
  const timeIssue = now ? lessonTimeIssue({ date, start, end, defaultDuration, weekStart: collection.weekStart }, now) : null;
  const today = now ? localDateTime(now.toISOString()).date : undefined;
  const rangeMin = collection.weekStart && today ? (collection.weekStart > today ? collection.weekStart : today) : collection.weekStart ?? today;
  const rangeMax = collection.weekStart ? lastDayOfWeek(collection.weekStart) : undefined;

  return <div data-dt="collection-workspace">
    <section data-dt="collection-panel">
      <header data-dt="collection-section-heading"><div><Text variant="eyebrow">{collection.status === "live" ? "SHARED AVAILABILITY" : "PRIVATE DRAFT"}</Text><Heading as="h2" size="panel">{collection.name}</Heading><Text variant="muted">Add exact lesson times, just as you would write them in a message.</Text></div><Badge tone={collection.status === "live" ? "success" : "neutral"}>{collection.status === "live" ? "Shared" : "Draft"}</Badge></header>
      <form id="collection-time-form" data-dt="collection-time-form" onSubmit={(event) => void save(event)}>
        <div><Heading as="h3" size="small">{editingId ? "Edit lesson time" : collection.slots.length ? "Add another time" : "Add a lesson time"}</Heading><Text variant="muted">Each time becomes one lesson option when shared. Add 09:00–12:00, then add 13:00–17:00 on the same date. Your usual lesson length is {lessonLength(defaultDuration)}.</Text></div>
        <LessonTimePicker date={date} start={start} end={end} defaultDuration={defaultDuration} weekStart={collection.weekStart} now={now} onDateChange={(value) => { setDate(value); setLocalError(null); }} onStartChange={(value) => { moveStart(value); setLocalError(null); }} onEndChange={(value) => { setEnd(value); setLocalError(null); }} />
        <div data-dt="collection-form-actions"><Button type="submit" disabled={busy || !date || !start || Boolean(timeIssue)}>{editingId ? "Save changes" : "Add time to list"}</Button>{!editingId && collection.status === "live" && <Button type="submit" variant="surface" value="open" disabled={busy || !date || !start || Boolean(timeIssue)}>Add and make bookable</Button>}{editingId && <Button type="button" variant="surface" onClick={() => resetForm()}>Cancel edit</Button>}</div>
      </form>
      {localError && <p data-dt="collection-feedback" role="alert">{localError}</p>}
      {error && errorArea === "time" && <p data-dt="collection-feedback" role="alert">{error}</p>}
      {notice && noticeArea === "time" && <p data-dt="collection-feedback" role="status">{notice}</p>}
      <div data-dt="collection-time-list">
        <div data-dt="collection-time-list-heading"><Heading as="h3" size="small">Times in this list</Heading><Badge tone="neutral">{collection.slots.length} {collection.slots.length === 1 ? "time" : "times"}</Badge></div>
        {groups.size === 0 && <EmptyState title="No times in this list yet" description="Add a date and lesson time above. You can save more times to this same list and come back later." />}
        {[...groups].map(([day, slots]) => <section key={day} data-dt="collection-day"><h3>{displayDate(slots[0].startsAt)}</h3><ul>{slots.map((slot) => {
          const booking = collection.bookings.find((item) => item.slotId === slot.id);
          return <li key={slot.id} data-state={slot.status}><div data-dt="collection-slot-time"><strong>{displayTime(slot.startsAt)}–{displayTime(slot.endsAt)}</strong><Badge tone={slot.status === "booked" ? "warning" : slot.status === "open" ? "success" : "neutral"}>{slot.status === "open" ? "Bookable" : slot.status === "private" ? "Private" : slot.status === "booked" ? "Booked" : "Closed"}</Badge></div>
            {booking && <small>Booked by {booking.name} · {booking.email} {lessonHref && <a href={lessonHref(booking.id)}>Open lesson</a>}</small>}
            {booking && onChangeBooking && <div data-dt="collection-booking-actions"><Button type="button" variant="ghost" size="2" disabled={busy} onClick={() => { setChangingBookingId(changingBookingId === booking.id ? null : booking.id); setReplacementSlotId(""); }}>Move lesson</Button><Button type="button" variant="ghost" size="2" disabled={busy} onClick={() => { if (window.confirm(`Cancel ${booking.name}’s lesson? They will be notified if email is connected.`)) void onChangeBooking(booking.id, "cancel"); }}>Cancel lesson</Button></div>}
            {booking && changingBookingId === booking.id && <div data-dt="collection-booking-move"><SelectField id={`move-${booking.id}`} label="Move to an open time in this week" value={replacementSlotId} onChange={(event) => setReplacementSlotId(event.target.value)}><option value="">Choose a time</option>{collection.slots.filter((candidate) => candidate.status === "open" && new Date(candidate.startsAt) > new Date()).map((candidate) => <option key={candidate.id} value={candidate.id}>{displayDate(candidate.startsAt)} · {displayTime(candidate.startsAt)}–{displayTime(candidate.endsAt)}</option>)}</SelectField><Button type="button" disabled={!replacementSlotId || busy} onClick={() => { if (onChangeBooking) void onChangeBooking(booking.id, "reschedule", replacementSlotId); }}>Confirm move</Button></div>}
            {slot.status !== "booked" && <div data-dt="collection-row-actions"><Button type="button" variant="ghost" size="2" onClick={() => edit(slot)}>Edit</Button>{slot.status === "private" && collection.status === "live" && <Button type="button" variant="ghost" size="2" onClick={() => void onSetStatus(slot.id, "open")}>Make available</Button>}{slot.status === "open" && <Button type="button" variant="ghost" size="2" onClick={() => void onSetStatus(slot.id, "closed")}>Close time</Button>}{slot.status === "closed" && <Button type="button" variant="ghost" size="2" onClick={() => void onSetStatus(slot.id, collection.status === "live" ? "open" : "private")}>Reopen</Button>}</div>}
          </li>;
        })}</ul></section>)}
        {error && errorArea === "list" && <p data-dt="collection-feedback" role="alert">{error}</p>}
        {notice && noticeArea === "list" && <p data-dt="collection-feedback" role="status">{notice}</p>}
      </div>
      <details data-dt="collection-generator"><summary>Or split a wider range into lesson times</summary><form onSubmit={(event) => { event.preventDefault(); void onGenerate({ date: rangeDate, from: rangeFrom, to: rangeTo, duration: rangeDuration, gap: rangeGap }); }}><Text variant="muted">For example, split 09:00–17:00 into {lessonLength(defaultDuration)} lessons with a {defaultGap}-minute gap. Edit any suggested time afterwards.</Text><div data-dt="collection-generator-fields"><Field id="range-date" label="Date" type="date" value={rangeDate} min={rangeMin} max={rangeMax} required onChange={(event) => setRangeDate(event.target.value)} /><Field id="range-from" label="From" type="time" value={rangeFrom} required onChange={(event) => setRangeFrom(event.target.value)} /><Field id="range-to" label="Until" type="time" value={rangeTo} required onChange={(event) => setRangeTo(event.target.value)} /><Field id="range-duration" label="Lesson minutes" type="number" min={15} max={480} value={rangeDuration} onChange={(event) => setRangeDuration(Number(event.target.value))} /><Field id="range-gap" label="Gap minutes" type="number" min={0} max={120} value={rangeGap} onChange={(event) => setRangeGap(Number(event.target.value))} /></div><Button type="submit" variant="surface" disabled={busy}>Generate times</Button></form></details>
      {error && errorArea === "generator" && <p data-dt="collection-feedback" role="alert">{error}</p>}
      {notice && noticeArea === "generator" && <p data-dt="collection-feedback" role="status">{notice}</p>}
    </section>
    <aside data-dt="collection-share">
      <section data-dt="collection-preview-controls"><Heading as="h3" size="small">See what people will see</Heading><Text variant="muted">Preview this week before sending it. Draft previews show the times you are preparing to share.</Text><div><Button type="button" variant="surface" onClick={() => void showPreview("invitation")}>Personal invitation</Button><Button type="button" variant="surface" onClick={() => void showPreview("general")}>General link</Button></div>{previewError && <p role="alert">{previewError}</p>}</section>
      {preview && <section data-dt="collection-preview"><div><strong>Preview only · no booking can be made here</strong><Button type="button" variant="ghost" onClick={() => setPreview(null)}>Close</Button></div><PublicCollectionPicker collection={preview} onRequestAccess={async () => {}} onBook={async () => {}} busy={false} error={null} notice={null} preview /></section>}
      <div data-dt="collection-section-heading"><Text variant="eyebrow">{collection.status === "live" ? "INVITATIONS" : "WHEN YOU ARE READY"}</Text><Heading as="h3" size="panel">{collection.status === "live" ? "Invite another person" : "Share this list"}</Heading><Text variant="muted">Only the times you make available appear to people you invite. A booked time disappears from everyone else’s choices.</Text></div>
      <form data-dt="collection-invite-form" onSubmit={(event) => void invite(event)}>
        {contacts.length > 0 && <SelectField id="existing-contact" label="Choose someone already known" value={contact} onChange={(event) => { setContact(event.target.value); const found = contacts.find((item) => item.email === event.target.value); if (found) { setInviteName(found.name); setInviteEmail(found.email); } }}><option value="">Or enter a new person below</option>{contacts.map((item) => <option key={item.email} value={item.email}>{item.name} · {item.email}</option>)}</SelectField>}
        <Field id="invite-name" label="Name" value={inviteName} required onChange={(event) => setInviteName(event.target.value)} />
        <Field id="invite-email" label="Email" type="email" value={inviteEmail} required onChange={(event) => setInviteEmail(event.target.value)} />
        <Button type="submit" disabled={busy || !hasSharableTimes}>{renewingInvitation ? "Send a new link" : "Send invitation"}</Button>
        {renewingInvitation && <Text variant="caption">This replaces the person’s earlier link. Their confirmed bookings stay in place.</Text>}
        <Text variant="caption">Sharing a draft releases its times. New times saved privately in a shared list stay private until you make them bookable.</Text>
      </form>
      {lastInvitation && <div data-dt="collection-link-result"><strong>{lastInvitation.emailStatus === "sent" ? "Invitation sent" : "Invitation created, but email is not connected"}</strong><Text variant="muted">{lastInvitation.emailStatus === "sent" ? "The person can open their personal booking link." : "Copy the personal link and send it yourself for now."}</Text><Button type="button" variant="surface" onClick={() => void copy(lastInvitation.url)}>{copied ? "Copied" : "Copy personal link"}</Button></div>}
      <div data-dt="collection-general-link"><Heading as="h4" size="small">Or share one general link</Heading><Text variant="muted">Anyone with it can see the remaining times. New people confirm their email before booking.</Text>{link ? <Button type="button" variant="surface" onClick={() => void copy(link)}>{copied ? "Copied" : "Copy general link"}</Button> : <Button type="button" variant="surface" disabled={busy || !hasSharableTimes} onClick={() => void onGeneralLink()}>Create general link</Button>}</div>
      {collection.invitations.length > 0 && <div data-dt="collection-invitees"><h4>Invited people</h4><ul>{collection.invitations.map((invite) => <li key={invite.id}><span><strong>{invite.name}</strong><small>{invite.email}</small></span><Badge tone={invite.emailStatus === "sent" ? "success" : "warning"}>{invite.emailStatus === "sent" ? "Invited" : "Email pending"}</Badge></li>)}</ul></div>}
      {error && errorArea === "share" && <p data-dt="collection-feedback" role="alert">{error}</p>}
      {notice && noticeArea === "share" && <p data-dt="collection-feedback" role="status">{notice}</p>}
    </aside>
  </div>;
}

export type PublicCollection = { collectionId?: string; collectionName: string; instructorName: string; instructorEmail?: string; contactPhone?: string | null; timezone: string; name: string | null; kind: "invitation" | "access" | "general"; slots: { id: string; startsAt: string; endsAt: string }[]; ownBookings: { id: string; startsAt: string; endsAt: string }[] };

export function PublicCollectionPicker({ collection, onRequestAccess, onBook, onChangeBooking, busy, error, notice, preview = false }: {
  collection: PublicCollection; onRequestAccess: (name: string, email: string) => Promise<void>; onBook: (slotId: string) => Promise<void>;
  onChangeBooking?: (bookingId: string, action: "cancel" | "reschedule", slotId?: string) => Promise<void>;
  busy: boolean; error: string | null; notice: string | null; preview?: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [changingId, setChangingId] = useState<string | null>(null);
  const [replacement, setReplacement] = useState("");
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { const timer = window.setTimeout(() => setNow(new Date()), 0); return () => window.clearTimeout(timer); }, []);
  const dates = new Map<string, typeof collection.slots>();
  const dayFormat = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: collection.timezone });
  const timeFormat = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: collection.timezone });
  for (const slot of collection.slots) {
    const day = dayFormat.format(new Date(slot.startsAt));
    dates.set(day, [...(dates.get(day) ?? []), slot]);
  }
  return <main data-dt="public-collection">
    <header><Text variant="eyebrow">DRIVETRACK · LESSON TIMES</Text><Heading as="h1" size="section">Choose a lesson with {collection.instructorName}</Heading><Text variant="muted">{collection.collectionName}. {preview ? "This is how the available times will appear." : "Only currently available times are shown."}</Text></header>
    {collection.ownBookings.length > 0 && <section data-dt="public-own-bookings"><Heading as="h2" size="small">Your confirmed lessons</Heading>{collection.ownBookings.map((booking) => {
      const canChange = now && new Date(booking.startsAt).getTime() - now.getTime() >= 48 * 3_600_000;
      return <div key={booking.id} data-dt="public-booking-row"><strong>{dayFormat.format(new Date(booking.startsAt))}, {timeFormat.format(new Date(booking.startsAt))}–{timeFormat.format(new Date(booking.endsAt))}</strong>
        {!preview && canChange && onChangeBooking && <div data-dt="public-booking-actions"><Button type="button" variant="surface" disabled={busy} onClick={() => { setChangingId(changingId === booking.id ? null : booking.id); setReplacement(""); }}>Change time</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => { if (window.confirm("Cancel this lesson? The time may become bookable again.")) void onChangeBooking(booking.id, "cancel"); }}>Cancel lesson</Button></div>}
        {!preview && now && !canChange && <Text variant="muted">This lesson is within 48 hours. Contact your instructor to make a change: {collection.instructorEmail ?? "use your invitation email"}{collection.contactPhone ? ` · ${collection.contactPhone}` : ""}.</Text>}
        {changingId === booking.id && canChange && <div data-dt="public-reschedule"><SelectField id={`replacement-${booking.id}`} label="Choose a new available time" value={replacement} onChange={(event) => setReplacement(event.target.value)}><option value="">Select a time</option>{collection.slots.map((slot) => <option key={slot.id} value={slot.id}>{dayFormat.format(new Date(slot.startsAt))}, {timeFormat.format(new Date(slot.startsAt))}–{timeFormat.format(new Date(slot.endsAt))}</option>)}</SelectField><Button type="button" disabled={!replacement || busy} onClick={() => { if (onChangeBooking) void onChangeBooking(booking.id, "reschedule", replacement); }}>Confirm new time</Button></div>}
      </div>;
    })}</section>}
    {dates.size === 0 ? <EmptyState title="No lesson times available right now" description="Please check this link again later or contact your instructor." /> : <section data-dt="public-collection-times"><Heading as="h2" size="panel">Available times</Heading>{[...dates].map(([day, slots]) => <div key={day} data-dt="public-collection-day"><h3>{day}</h3><div>{slots.map((slot) => <Button key={slot.id} type="button" variant="surface" disabled={preview || busy || collection.kind === "general"} onClick={() => void onBook(slot.id)}>{timeFormat.format(new Date(slot.startsAt))}–{timeFormat.format(new Date(slot.endsAt))}</Button>)}</div></div>)}</section>}
    {collection.kind === "general" && <form data-dt="public-verify-form" onSubmit={(event) => { event.preventDefault(); if (!preview) void onRequestAccess(name.trim(), email.trim()); }}><Heading as="h2" size="panel">Confirm your email to book</Heading><Text variant="muted">We’ll send a personal link to this address. Your instructor’s other appointments stay private.</Text><Field id="booker-name" label="Your name" value={name} required disabled={preview} onChange={(event) => setName(event.target.value)} /><Field id="booker-email" label="Your email" type="email" value={email} required disabled={preview} onChange={(event) => setEmail(event.target.value)} /><Button type="submit" disabled={preview || busy}>Send my booking link</Button></form>}
    {error && <p data-dt="collection-feedback" role="alert">{error}</p>}
    {notice && <p data-dt="collection-feedback" role="status">{notice}</p>}
  </main>;
}
