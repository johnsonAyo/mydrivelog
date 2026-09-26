import { Badge, Button, Heading, Text } from "./primitives";

export type LessonSkill = { skill: string; outcome: "introduced" | "developing" | "confident" };
export type LessonFields = {
  privateNotes: string; whatWeWorkedOn: string; whatToPractise: string; nextLessonFocus: string; skills: LessonSkill[];
};
export type LessonMessageView = {
  id: string; kind: "recap" | "follow_up"; recipientEmail: string; subject: string; body: string;
  status: "queued" | "sending" | "delivered" | "needs_attention"; attempts: number; lastAttemptAt: string | null; createdAt: string; deliveredAt: string | null;
};
export type LessonView = {
  id: string; learnerName: string; learnerEmail: string; startsAt: string; endsAt: string;
  bookingStatus: string; state: "upcoming" | "in-progress" | "awaiting-debrief" | "completed" | "cancelled";
  draft: LessonFields & { revision: number; completedAt: string | null; updatedAt: string | null };
  previousNextFocus: string | null; previousSkills: LessonSkill[]; messages: LessonMessageView[];
};
export type LessonPreview = { recipientEmail: string; subject: string; body: string; hash: string };

export function LessonDetail({ lesson, fields, saveStatus, error, busy, writable, preview, correction, onChange,
  onAddSkill, onChangeSkill, onRemoveSkill, onComplete, onPreview, onSend, onRetry, onRetrySave, onCorrectionChange }: {
  lesson: LessonView; fields: LessonFields; saveStatus: string; error: string | null; busy: boolean; writable: boolean;
  preview: LessonPreview | null; correction: string;
  onChange: (field: keyof Omit<LessonFields, "skills">, value: string) => void;
  onAddSkill: () => void; onChangeSkill: (index: number, value: LessonSkill) => void; onRemoveSkill: (index: number) => void;
  onComplete: () => void; onPreview: (kind: "recap" | "follow_up") => void; onSend: () => void;
  onRetry: (messageId: string) => void; onRetrySave: () => void; onCorrectionChange: (value: string) => void;
}) {
  const ended = new Date(lesson.endsAt) <= new Date();
  const recapSent = lesson.messages.some((message) => message.kind === "recap");
  const disabled = !writable || lesson.state === "cancelled";
  const lessonTime = new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/London" });
  return <div data-dt="lesson-detail">
    <section data-dt="lesson-panel">
      <div data-dt="lesson-panel-header"><div><Text variant="eyebrow">Booked lesson</Text><Heading as="h2" size="panel">{lesson.learnerName}</Heading>
        <Text variant="muted">{lessonTime.format(new Date(lesson.startsAt))}–{lessonTime.format(new Date(lesson.endsAt))} · {lesson.learnerEmail}</Text></div>
        <Badge tone={lesson.state === "awaiting-debrief" ? "warning" : lesson.state === "completed" ? "success" : "neutral"}>{lesson.state === "awaiting-debrief" ? "Awaiting debrief" : lesson.state.replaceAll("-", " ")}</Badge></div>
      {(lesson.previousNextFocus || lesson.previousSkills.length > 0) && <div data-dt="lesson-previous"><Heading as="h3" size="small">From the previous lesson</Heading>
        {lesson.previousNextFocus && <p><strong>Next focus:</strong> {lesson.previousNextFocus}</p>}
        {lesson.previousSkills.length > 0 && <p><strong>Skills:</strong> {lesson.previousSkills.map((item) => `${item.skill} (${item.outcome})`).join(", ")}</p>}</div>}
    </section>
    <section data-dt="lesson-panel" aria-labelledby="private-notes-title">
      <div data-dt="lesson-panel-header"><div><Text variant="eyebrow">Instructor only</Text><Heading as="h2" size="panel" id="private-notes-title">Private notes</Heading><Text variant="muted">Visible only in your workspace. Never included in a learner message.</Text></div></div>
      <div data-dt="lesson-panel-body"><label htmlFor="lesson-private">Preparation and observations</label><textarea id="lesson-private" rows={6} value={fields.privateNotes} maxLength={10000} disabled={disabled} onChange={(event) => onChange("privateNotes", event.target.value)} /></div>
    </section>
    <section data-dt="lesson-panel" aria-labelledby="learner-recap-title">
      <div data-dt="lesson-panel-header"><div><Text variant="eyebrow">Shared only after you approve</Text><Heading as="h2" size="panel" id="learner-recap-title">Recap for learner</Heading><Text variant="muted">Drafts save as you type. Nothing is emailed until you review and send.</Text></div></div>
      <div data-dt="lesson-panel-body">
        <label htmlFor="lesson-worked">What we worked on</label><textarea id="lesson-worked" rows={3} value={fields.whatWeWorkedOn} maxLength={5000} disabled={disabled} onChange={(event) => onChange("whatWeWorkedOn", event.target.value)} />
        <label htmlFor="lesson-practise">What to practise</label><textarea id="lesson-practise" rows={3} value={fields.whatToPractise} maxLength={5000} disabled={disabled} onChange={(event) => onChange("whatToPractise", event.target.value)} />
        <label htmlFor="lesson-focus">Next lesson focus</label><textarea id="lesson-focus" rows={2} value={fields.nextLessonFocus} maxLength={2000} disabled={disabled} onChange={(event) => onChange("nextLessonFocus", event.target.value)} />
        <div data-dt="lesson-skills"><Heading as="h3" size="small">Skills covered · optional</Heading>
          {fields.skills.map((item, index) => <div key={index} data-dt="lesson-skill-row"><label htmlFor={`lesson-skill-${index}`}>Skill {index + 1}</label><input id={`lesson-skill-${index}`} value={item.skill} maxLength={80} disabled={disabled} onChange={(event) => onChangeSkill(index, { ...item, skill: event.target.value })} />
            <label htmlFor={`lesson-outcome-${index}`}>Outcome</label><select id={`lesson-outcome-${index}`} value={item.outcome} disabled={disabled} onChange={(event) => onChangeSkill(index, { ...item, outcome: event.target.value as LessonSkill["outcome"] })}><option value="introduced">Introduced</option><option value="developing">Developing</option><option value="confident">Confident</option></select>
            <Button type="button" variant="ghost" size="2" disabled={disabled} onClick={() => onRemoveSkill(index)}>Remove</Button></div>)}
          <Button type="button" variant="surface" size="2" disabled={disabled || fields.skills.length >= 30} onClick={onAddSkill}>Add skill</Button>
        </div>
        <div data-dt="lesson-save-state" role="status" aria-live="polite">{saveStatus}{error && <><span role="alert"> {error}</span> <Button type="button" variant="ghost" size="2" onClick={onRetrySave}>Retry save</Button></>}</div>
      </div>
    </section>
    <section data-dt="lesson-panel"><div data-dt="lesson-panel-header"><Heading as="h2" size="panel">Finish and share</Heading></div><div data-dt="lesson-panel-body">
      {!lesson.draft.completedAt && <Button type="button" disabled={disabled || busy || !ended} onClick={onComplete}>Complete lesson</Button>}
      {!ended && <Text variant="muted">Completion and learner messages become available after the booked end time.</Text>}
      {ended && !recapSent && <Button type="button" variant="surface" disabled={disabled || busy} onClick={() => onPreview("recap")}>Review learner recap</Button>}
      {recapSent && <><label htmlFor="lesson-correction">Follow-up correction</label><textarea id="lesson-correction" rows={3} value={correction} maxLength={5000} disabled={disabled} onChange={(event) => onCorrectionChange(event.target.value)} />
        <Button type="button" variant="surface" disabled={disabled || busy || !correction.trim()} onClick={() => onPreview("follow_up")}>Review follow-up</Button></>}
      {preview && <div data-dt="lesson-preview"><Heading as="h3" size="small">Review exact email</Heading><p><strong>To:</strong> {preview.recipientEmail}</p><p><strong>Subject:</strong> {preview.subject}</p><pre>{preview.body}</pre><Button type="button" disabled={disabled || busy} onClick={onSend}>Approve and send</Button></div>}
      {lesson.messages.length > 0 && <div data-dt="lesson-messages"><Heading as="h3" size="small">Message history</Heading>{lesson.messages.map((message) => <article key={message.id}><p><strong>{message.kind === "recap" ? "Learner recap" : "Follow-up"}</strong> · {message.status.replaceAll("_", " ")}</p><p>To: {message.recipientEmail}</p><p>Subject: {message.subject}</p><pre>{message.body}</pre>{(message.status === "needs_attention" || message.status === "sending") && <><Text variant="muted">{message.status === "sending" ? "Delivery is still processing. If it stays here, check the learner’s inbox before retrying. Retry becomes available after five minutes." : "Delivery needs attention. The approved message is saved."}</Text><Button type="button" variant="surface" disabled={disabled || busy} onClick={() => onRetry(message.id)}>Retry this message</Button></>}</article>)}</div>}
    </div></section>
  </div>;
}
