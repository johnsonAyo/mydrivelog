"use client";

import { useState, type FormEvent } from "react";
import { Button, EmptyState, Field, Heading, Text } from "./primitives";

export type Learner = { id: string | null; name: string; email: string; sourceEmail: string; upcomingLessons: number };

export function LearnerDirectory({ learners, onSave, busy, message }: {
  learners: readonly Learner[];
  onSave: (input: { sourceEmail: string; name: string; email: string }) => Promise<void>;
  busy: boolean;
  message: string | null;
}) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Learner | null>(null);
  const [adding, setAdding] = useState(false);
  const filtered = learners.filter((learner) => `${learner.name} ${learner.email}`.toLowerCase().includes(query.toLowerCase()));
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim().toLowerCase();
    void onSave({ sourceEmail: editing?.sourceEmail ?? email, name: String(data.get("name") ?? "").trim(), email }).then(() => { setAdding(false); setEditing(null); }).catch(() => {});
  }
  return <section data-dt="learner-directory">
    <div data-dt="collection-section-heading"><div><Text variant="eyebrow">PEOPLE</Text><Heading as="h2" size="panel">Your learners</Heading><Text variant="muted">People you have invited or booked appear here automatically. Add someone ahead of time when you need to.</Text></div><Button type="button" onClick={() => { setEditing(null); setAdding(true); }}>Add learner</Button></div>
    <Field id="learner-search" label="Find a learner" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or email" />
    {(adding || editing) && <form data-dt="learner-form" key={editing?.sourceEmail ?? "new"} onSubmit={submit}>
      <Heading as="h3" size="small">{editing ? "Correct details" : "Add learner"}</Heading>
      <Field id="learner-name" name="name" label="Name" defaultValue={editing?.name ?? ""} required />
      <Field id="learner-email" name="email" label="Email" type="email" defaultValue={editing?.email ?? ""} required />
      <div><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save learner"}</Button><Button type="button" variant="surface" onClick={() => { setAdding(false); setEditing(null); }}>Cancel</Button></div>
    </form>}
    {message && <p data-dt="collection-feedback" role="status">{message}</p>}
    {filtered.length ? <div data-dt="learner-list">{filtered.map((learner) => <article key={learner.sourceEmail} data-dt="learner-row"><div><strong>{learner.name}</strong><Text variant="muted">{learner.email}</Text></div><span>{learner.upcomingLessons} upcoming {learner.upcomingLessons === 1 ? "lesson" : "lessons"}</span><Button type="button" variant="surface" onClick={() => { setAdding(false); setEditing(learner); }}>Edit</Button></article>)}</div> : <EmptyState title={query ? "No matching learners" : "No learners yet"} description={query ? "Try another name or email." : "Add a learner or invite someone from a shared week."} />}
  </section>;
}
