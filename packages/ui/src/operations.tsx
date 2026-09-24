import type { ReactNode } from "react";
import { Badge, Heading, Text } from "./primitives";

export function SchedulingNotice({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <aside data-dt="scheduling-notice" role="status">
      <span data-dt="notice-symbol" aria-hidden="true">!</span>
      <div>
        <strong>{title}</strong>
        <Text variant="muted">{description}</Text>
      </div>
      {action}
    </aside>
  );
}

export function AvailabilityReleaseSummary({
  title,
  slotCount,
  recipientCount,
  bookingAllowance,
  expiresAt,
  status = "draft",
  action,
}: {
  title: string;
  slotCount: number;
  recipientCount: number;
  bookingAllowance: string;
  expiresAt: string;
  status?: "draft" | "published" | "expired" | "revoked";
  action?: ReactNode;
}) {
  const statusLabel = {
    draft: "Draft",
    published: "Published",
    expired: "Expired",
    revoked: "Revoked",
  }[status];
  return (
    <section data-dt="release-summary" aria-label={title}>
      <header>
        <div>
          <Text variant="eyebrow">Availability release</Text>
          <Heading as="h2" size="panel">{title}</Heading>
        </div>
        <Badge tone={status === "published" ? "success" : "neutral"}>{statusLabel}</Badge>
      </header>
      <dl>
        <div><dt>Selected slots</dt><dd>{slotCount}</dd></div>
        <div><dt>Recipients</dt><dd>{recipientCount}</dd></div>
        <div><dt>Weekly allowance</dt><dd>{bookingAllowance}</dd></div>
        <div><dt>Links expire</dt><dd>{expiresAt}</dd></div>
      </dl>
      {action && <footer>{action}</footer>}
    </section>
  );
}

export function BookingSummaryCard({
  name,
  date,
  time,
  duration,
  state,
  action,
}: {
  name: string;
  date: string;
  time: string;
  duration: string;
  state: "confirmed" | "cancelled" | "completed";
  action?: ReactNode;
}) {
  const stateLabel = { confirmed: "Confirmed", cancelled: "Cancelled", completed: "Completed" }[state];
  return (
    <article data-dt="booking-summary" data-state={state} aria-label={`${name}, ${date} at ${time}, ${stateLabel}`}>
      <header>
        <div>
          <Text variant="eyebrow">Lesson booking</Text>
          <Heading as="h3" size="panel">{name}</Heading>
        </div>
        <Badge tone={state === "confirmed" ? "success" : "neutral"}>{stateLabel}</Badge>
      </header>
      <p><strong>{date}</strong><span>{time} · {duration}</span></p>
      {action && <footer>{action}</footer>}
    </article>
  );
}
