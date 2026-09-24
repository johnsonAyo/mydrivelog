# DriveTrack landing concept

Standalone landing-page prototype for DriveTrack. This folder is intentionally separate from the existing DriveTrack application.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Design notes

- Reserved neo-brutalist direction inspired by the supplied Codex Reset reference.
- Reference palette relationships: warm paper and muted ink lead; deep green anchors outlines and details, while UK-plate yellow marks primary actions and the current selection.
- Bricolage Grotesque is self-hosted from the installed font package.
- Button, Card, Badge, Accordion, and Tabs were initialized from the official `neobrutalism.dev` shadcn registry, then themed to the more restrained visual weight.
- The sticky navigation follows the visible section and moves its yellow highlight as the page scrolls.
- `src/app/globals.css` is the only CSS file. Landing rules are scoped to the page root so they cannot spill into the existing app if this concept is later integrated.
- The concept uses shared tokens and no arbitrary Tailwind values in app markup. Its standalone official neobrutalism.dev components and page-specific presentation rules are not a literal implementation of the separate styling-discipline project's prop-only `packages/ui` API.
