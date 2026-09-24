import type { ComponentProps, ReactNode } from "react";

export type Space = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
export type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";
export type Variant = "solid" | "soft" | "surface" | "outline" | "ghost" | "link";
export type Size = "1" | "2" | "3" | "4";

type ContainerTag = "div" | "section" | "article" | "aside" | "main";

type LayoutProps = {
  as?: ContainerTag;
  children: ReactNode;
  gap?: Space;
  id?: string;
};

export function Stack({ as: Tag = "div", children, gap = "4", id }: LayoutProps) {
  return <Tag data-dt="stack" data-gap={gap} id={id}>{children}</Tag>;
}

export function Container({ as: Tag = "div", children, id }: Omit<LayoutProps, "gap">) {
  return <Tag data-dt="container" id={id}>{children}</Tag>;
}

export function Inline({ as: Tag = "div", children, gap = "3", id }: LayoutProps) {
  return <Tag data-dt="inline" data-gap={gap} id={id}>{children}</Tag>;
}

export function Surface({
  as: Tag = "div",
  children,
  tone = "neutral",
  padding = "5",
  id,
}: LayoutProps & { tone?: Tone; padding?: Space }) {
  return <Tag data-dt="surface" data-tone={tone} data-padding={padding} id={id}>{children}</Tag>;
}

export function Heading({
  as: Tag = "h2",
  size = "section",
  children,
  id,
}: {
  as?: "h1" | "h2" | "h3" | "h4";
  size?: "hero" | "section" | "panel" | "small";
  children: ReactNode;
  id?: string;
}) {
  return <Tag data-dt="heading" data-size={size} id={id}>{children}</Tag>;
}

export function Text({
  as: Tag = "p",
  variant = "body",
  children,
}: {
  as?: "p" | "span" | "small";
  variant?: "body" | "muted" | "eyebrow" | "caption";
  children: ReactNode;
}) {
  return <Tag data-dt="text" data-variant={variant}>{children}</Tag>;
}

export function Button({
  tone = "brand",
  variant = "solid",
  size = "3",
  children,
  ...props
}: ComponentProps<"button"> & { tone?: Tone; variant?: Variant; size?: Size }) {
  return <button data-dt="button" data-tone={tone} data-variant={variant} data-size={size} {...props}>{children}</button>;
}

export function Badge({
  tone = "neutral",
  children,
}: { tone?: Tone; children: ReactNode }) {
  return <span data-dt="badge" data-tone={tone}>{children}</span>;
}

export function Field({
  label,
  hint,
  error,
  id,
  ...props
}: Omit<ComponentProps<"input">, "id"> & { id: string; label: string; hint?: string; error?: string }) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div data-dt="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} aria-invalid={Boolean(error)} aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined} {...props} />
      {hint && <small id={hintId}>{hint}</small>}
      {error && <small id={errorId} data-error>{error}</small>}
    </div>
  );
}

export function TextareaField({
  label,
  hint,
  id,
  ...props
}: Omit<ComponentProps<"textarea">, "id"> & { id: string; label: string; hint?: string }) {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div data-dt="field">
      <label htmlFor={id}>{label}</label>
      <textarea id={id} aria-describedby={hintId} {...props} />
      {hint && <small id={hintId}>{hint}</small>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: { title: string; description: string; action?: ReactNode }) {
  return (
    <div data-dt="empty-state">
      <span aria-hidden="true" data-dt="empty-state-mark">—</span>
      <Heading as="h3" size="panel">{title}</Heading>
      <Text variant="muted">{description}</Text>
      {action}
    </div>
  );
}
