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
- Exact reference palette relationships: warm paper, deep green, muted ink, pale green, and soft stone borders.
- Bricolage Grotesque is self-hosted from the installed font package.
- Button, Card, Badge, Accordion, and Tabs were initialized from the official `neobrutalism.dev` shadcn registry, then themed to the more restrained visual weight.
- `src/components/route-accent.tsx` contains the optional yellow route-card accent and can be removed independently.
