"use client";

import { useState, type FormEvent } from "react";
import { Badge, Button, EmptyState, Field, Heading, SelectField, Text } from "./primitives";

export type CollectionSummary = { id: string; name: string; status: "draft" | "live"; updatedAt: string; slotCount: number; openCount: number; bookingCount: number };
export type CollectionDetail = { id: string; name: string; status: "draft" | "live"; slots: CollectionSlot[]; invitations: CollectionInvitation[]; bookings: CollectionBooking[]; generalToken: string | null };
export type CollectionSlot = { id: string; startsAt: string; endsAt: string; status: "private" | "open" | "booked" | "closed" };
export type CollectionInvitation = { id: string; name: string; email: string; emailStatus: string };
export type CollectionBooking = { id: string; slotId: string; name: string; email: string; startsAt: string; endsAt: string; confirmationEmailStatus: string };
export type ContactOption = { name: string; email: string };
export type SlotInput = { startsAt: string; endsAt: string; makeAvailable: boolean };

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

export function CollectionChooser({ collections, selectedId, defaultName, onCreate, onSelect, busy, error }: {
  collections: readonly CollectionSummary[]; selectedId: string | null; defaultName: string;
  onCreate: (name: string) => Promise<void>; onSelect: (id: string) => void; busy: boolean; error: string | null;
}) {
  const [name, setName] = useState(defaultName);
  async function create(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2) return;
    await onCreate(name.trim());
    setName(defaultName);
  }
  return <section data-dt="collection-chooser">
    <div data-dt="collection-section-heading"><div><Text variant="eyebrow">YOUR AVAILABILITY</Text><Heading as="h2" size="panel">Start with a time list</Heading><Text variant="muted">Build it in stages. Nothing is visible until you share it.</Text></div></div>
    <form data-dt="collection-new-form" onSubmit={(event) => void create(event)}>
      <Field id="collection-name" label="Name this list" value={name} onChange={(event) => setName(event.target.value)} placeholder="Week of 28 September" maxLength={100} />
      <Button type="submit" disabled={busy || name.trim().length < 2}>Create draft</Button>
    </form>
    {error && <p data-dt="collection-feedback" role="alert">{error}</p>}
    {collections.length > 0 && <div data-dt="collection-list" aria-label="Availability lists">{collections.map((collection) => <button key={collection.id} type="button" data-dt="collection-list-item" aria-current={selectedId === collection.id ? "true" : undefined} onClick={() => onSelect(collection.id)}>
      <span><strong>{collection.name}</strong><small>{collection.slotCount} {collection.slotCount === 1 ? "time" : "times"} · {collection.bookingCount} booked</small></span>
      <Badge tone={collection.status === "live" ? "success" : "neutral"}>{collection.status === "live" ? "Shared" : "Draft"}</Badge>
    </button>)}</div>}
  </section>;
}

export function CollectionEditor({ collection, contacts, defaultDuration, defaultGap, onSaveSlot, onSetStatus, onGenerate, onInvite, onGeneralLink, generalUrl, lastInvitation, busy, error, notice }: {
  collection: CollectionDetail; contacts: readonly ContactOption[]; defaultDuration: number; defaultGap: number;
  onSaveSlot: (input: SlotInput, id?: string) => Promise<boolean>; onSetStatus: (slotId: string, status: "private" | "open" | "closed") => Promise<void>;
  onGenerate: (input: { date: string; from: string; to: string; duration: number; gap: number }) => Promise<void>;
  onInvite: (name: string, email: string) => Promise<void>; onGeneralLink: () => Promise<void>;
  generalUrl: string | null; lastInvitation: { url: string; emailStatus: string } | null; busy: boolean; error: string | null; notice: string | null;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("");
  const [rangeDate, setRangeDate] = useState("");
  const [rangeFrom, setRangeFrom] = useState("09:00");
  const [rangeTo, setRangeTo] = useState("17:00");
  const [rangeDuration, setRangeDuration] = useState(defaultDuration);
  const [rangeGap, setRangeGap] = useState(defaultGap);
  const [contact, setContact] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [copied, setCopied] = useState(false);

  function resetForm() { setEditingId(null); setDate(""); setStart("09:00"); setEnd(""); }
  function edit(slot: CollectionSlot) {
    const from = localDateTime(slot.startsAt);
    const to = localDateTime(slot.endsAt);
    setEditingId(slot.id); setDate(from.date); setStart(from.time); setEnd(to.time);
    document.getElementById("collection-time-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function moveStart(next: string) {
    if (date && start && end) {
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
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const begins = new Date(`${date}T${start}`);
    const finishes = end ? new Date(`${date}T${end}`) : new Date(begins.getTime() + defaultDuration * 60_000);
    const saved = await onSaveSlot({ startsAt: begins.toISOString(), endsAt: finishes.toISOString(), makeAvailable: submitter?.value === "open" }, editingId ?? undefined);
    if (saved) resetForm();
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

  return <div data-dt="collection-workspace">
    <section data-dt="collection-panel">
      <header data-dt="collection-section-heading"><div><Text variant="eyebrow">{collection.status === "live" ? "SHARED AVAILABILITY" : "PRIVATE DRAFT"}</Text><Heading as="h2" size="panel">{collection.name}</Heading><Text variant="muted">Add exact lesson times, just as you would write them in a message.</Text></div><Badge tone={collection.status === "live" ? "success" : "neutral"}>{collection.status === "live" ? "Shared" : "Draft"}</Badge></header>
      <div data-dt="collection-time-list">
        {groups.size === 0 && <EmptyState title="No times in this list yet" description="Add your first date and lesson time below. You can save and come back later." />}
        {[...groups].map(([day, slots]) => <section key={day} data-dt="collection-day"><h3>{displayDate(slots[0].startsAt)}</h3><ul>{slots.map((slot) => {
          const booking = collection.bookings.find((item) => item.slotId === slot.id);
          return <li key={slot.id} data-state={slot.status}><div data-dt="collection-slot-time"><strong>{displayTime(slot.startsAt)}–{displayTime(slot.endsAt)}</strong><Badge tone={slot.status === "booked" ? "warning" : slot.status === "open" ? "success" : "neutral"}>{slot.status === "open" ? "Bookable" : slot.status === "private" ? "Private" : slot.status === "booked" ? "Booked" : "Closed"}</Badge></div>
            {booking && <small>Booked by {booking.name}</small>}
            {slot.status !== "booked" && <div data-dt="collection-row-actions"><Button type="button" variant="ghost" size="2" onClick={() => edit(slot)}>Edit</Button>{slot.status === "private" && collection.status === "live" && <Button type="button" variant="ghost" size="2" onClick={() => void onSetStatus(slot.id, "open")}>Make available</Button>}{slot.status === "open" && <Button type="button" variant="ghost" size="2" onClick={() => void onSetStatus(slot.id, "closed")}>Close time</Button>}{slot.status === "closed" && <Button type="button" variant="ghost" size="2" onClick={() => void onSetStatus(slot.id, collection.status === "live" ? "open" : "private")}>Reopen</Button>}</div>}
          </li>;
        })}</ul></section>)}
      </div>
      <form id="collection-time-form" data-dt="collection-time-form" onSubmit={(event) => void save(event)}>
        <div><Heading as="h3" size="small">{editingId ? "Edit lesson time" : "Add a lesson time"}</Heading><Text variant="muted">Your usual lesson length is {defaultDuration} minutes. Adjust the end whenever you need to.</Text></div>
        <div data-dt="collection-time-fields"><Field id="lesson-date" label="Date" type="date" value={date} required onChange={(event) => setDate(event.target.value)} /><Field id="lesson-start" label="Starts" type="time" value={start} required onChange={(event) => moveStart(event.target.value)} /><Field id="lesson-end" label="Ends" type="time" value={end} onChange={(event) => setEnd(event.target.value)} hint={end ? undefined : `Defaults to ${defaultDuration} minutes after start`} /></div>
        <div data-dt="collection-form-actions"><Button type="submit" disabled={busy}>{editingId ? "Save changes" : "Save privately"}</Button>{!editingId && collection.status === "live" && <Button type="submit" variant="surface" value="open" disabled={busy}>Make bookable</Button>}{editingId && <Button type="button" variant="surface" onClick={resetForm}>Cancel edit</Button>}</div>
      </form>
      <details data-dt="collection-generator"><summary>Generate several times from a range</summary><form onSubmit={(event) => { event.preventDefault(); void onGenerate({ date: rangeDate, from: rangeFrom, to: rangeTo, duration: rangeDuration, gap: rangeGap }); }}><Text variant="muted">Start with suggested times, then edit any one in the list.</Text><div data-dt="collection-generator-fields"><Field id="range-date" label="Date" type="date" value={rangeDate} required onChange={(event) => setRangeDate(event.target.value)} /><Field id="range-from" label="From" type="time" value={rangeFrom} required onChange={(event) => setRangeFrom(event.target.value)} /><Field id="range-to" label="Until" type="time" value={rangeTo} required onChange={(event) => setRangeTo(event.target.value)} /><Field id="range-duration" label="Lesson minutes" type="number" min={15} max={480} value={rangeDuration} onChange={(event) => setRangeDuration(Number(event.target.value))} /><Field id="range-gap" label="Gap minutes" type="number" min={0} max={120} value={rangeGap} onChange={(event) => setRangeGap(Number(event.target.value))} /></div><Button type="submit" variant="surface" disabled={busy}>Generate times</Button></form></details>
    </section>
    <aside data-dt="collection-share">
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
      {error && <p data-dt="collection-feedback" role="alert">{error}</p>}
      {notice && <p data-dt="collection-feedback" role="status">{notice}</p>}
    </aside>
  </div>;
}

export type PublicCollection = { collectionName: string; instructorName: string; timezone: string; name: string | null; kind: "invitation" | "access" | "general"; slots: { id: string; startsAt: string; endsAt: string }[]; ownBookings: { id: string; startsAt: string; endsAt: string }[] };

export function PublicCollectionPicker({ collection, onRequestAccess, onBook, busy, error, notice }: {
  collection: PublicCollection; onRequestAccess: (name: string, email: string) => Promise<void>; onBook: (slotId: string) => Promise<void>; busy: boolean; error: string | null; notice: string | null;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const dates = new Map<string, typeof collection.slots>();
  const dayFormat = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: collection.timezone });
  const timeFormat = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: collection.timezone });
  for (const slot of collection.slots) {
    const day = dayFormat.format(new Date(slot.startsAt));
    dates.set(day, [...(dates.get(day) ?? []), slot]);
  }
  return <main data-dt="public-collection">
    <header><Text variant="eyebrow">DRIVETRACK · LESSON TIMES</Text><Heading as="h1" size="section">Choose a lesson with {collection.instructorName}</Heading><Text variant="muted">{collection.collectionName}. Only currently available times are shown.</Text></header>
    {collection.ownBookings.length > 0 && <section data-dt="public-own-bookings"><Heading as="h2" size="small">Your confirmed lessons</Heading>{collection.ownBookings.map((booking) => <p key={booking.id}>{dayFormat.format(new Date(booking.startsAt))}, {timeFormat.format(new Date(booking.startsAt))}–{timeFormat.format(new Date(booking.endsAt))}</p>)}</section>}
    {dates.size === 0 ? <EmptyState title="No lesson times available right now" description="Please check this link again later or contact your instructor." /> : <section data-dt="public-collection-times"><Heading as="h2" size="panel">Available times</Heading>{[...dates].map(([day, slots]) => <div key={day} data-dt="public-collection-day"><h3>{day}</h3><div>{slots.map((slot) => <Button key={slot.id} type="button" variant="surface" disabled={busy || collection.kind === "general"} onClick={() => void onBook(slot.id)}>{timeFormat.format(new Date(slot.startsAt))}–{timeFormat.format(new Date(slot.endsAt))}</Button>)}</div></div>)}</section>}
    {collection.kind === "general" && <form data-dt="public-verify-form" onSubmit={(event) => { event.preventDefault(); void onRequestAccess(name.trim(), email.trim()); }}><Heading as="h2" size="panel">Confirm your email to book</Heading><Text variant="muted">We’ll send a personal link to this address. Your instructor’s other appointments stay private.</Text><Field id="booker-name" label="Your name" value={name} required onChange={(event) => setName(event.target.value)} /><Field id="booker-email" label="Your email" type="email" value={email} required onChange={(event) => setEmail(event.target.value)} /><Button type="submit" disabled={busy}>Send my booking link</Button></form>}
    {error && <p data-dt="collection-feedback" role="alert">{error}</p>}
    {notice && <p data-dt="collection-feedback" role="status">{notice}</p>}
  </main>;
}
