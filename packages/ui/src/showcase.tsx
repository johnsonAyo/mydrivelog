import type { ReactNode } from "react";
import { Container, Heading, Stack, Text } from "./primitives";

export function Showcase({ children }: { children: ReactNode }) {
  return <main data-dt="lab"><Container as="section">{children}</Container></main>;
}

export function ShowcaseIntro({ title, description }: { title: string; description: string }) {
  return (
    <header data-dt="lab-intro">
      <Stack gap="4">
        <Text variant="eyebrow">DriveTrack product system</Text>
        <Heading as="h1" size="hero">{title}</Heading>
        <Text variant="muted">{description}</Text>
      </Stack>
    </header>
  );
}

export function ShowcaseSection({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return (
    <section data-dt="lab-section" id={id} aria-labelledby={`${id}-title`}>
      <div>
        <Text variant="eyebrow">In isolation</Text>
        <Heading as="h2" size="section" id={`${id}-title`}>{title}</Heading>
        <Text variant="muted">{description}</Text>
      </div>
      {children}
    </section>
  );
}

export function ShowcaseGrid({ children }: { children: ReactNode }) {
  return <div data-dt="lab-grid">{children}</div>;
}
