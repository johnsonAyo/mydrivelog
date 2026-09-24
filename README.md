# DriveTrack

DriveTrack is an instructor-first lesson planning product. This repository combines the approved landing page, the existing availability backend, and an isolated product-component system. The earlier `drivetrack` repository remains untouched as a fallback; no database records or secrets were moved.

## Run locally

```bash
npm install
npm run dev
```

Requires Node.js 22 or later and PostgreSQL for database-backed routes. Open `http://localhost:3000` for the landing page, `/preview/today` and `/preview/calendar` for complete product-screen previews, and `/component-lab` for isolated components. These preview routes use sample data and need no authentication, email provider, or database; their controls do not save changes. `/api/v1/health` does not require a database; readiness and availability routes do.

The authentication provider is not finalised. The existing email-link route is provisional and is **not required to review the design**. If testing that route, copy `.env.example` to `.env.local`, configure PostgreSQL, run `npm run db:migrate`, and set `APP_BASE_URL`, `RESEND_API_KEY`, and `ACCESS_EMAIL_FROM`; the sender address must be authorised for the configured Resend account. Start at `/get-started`; the email link creates a Solo workspace and starts its 14-day trial on first verification. Returning instructors use `/sign-in`. `/calendar` is the protected, database-backed instructor screen: it reads and creates availability, and exports all availability as JSON. The trial expires into read-only access; it does not delete records.

Subscription checkout, release/booking/debrief endpoints, and the corresponding working pages are not implemented yet. The £24/month Solo price and self-serve checkout are agreed product decisions, not live billing features. Do not launch the trial publicly without completing checkout and production email/abuse controls.

## Verify

```bash
npm run verify
```

This runs stylesheet and product-style boundary checks, type-checking, backend tests, lint, and a production build. No database integration test is included.

## Where things live

- `src/app/page.tsx` and `src/components` — approved landing page and official neobrutalism.dev shadcn components.
- `packages/tokens` — shared paper, ink, green, yellow, spacing, and shadow tokens.
- `packages/ui` — prop-driven product primitives and isolated calendar, lesson, and debrief components.
- `src/app/component-lab` — visual inventory with clearly marked sample data.
- `src/app/api`, `src/presentation`, `src/application`, `src/domain`, `src/infrastructure` — availability, access-link authentication, and trial entitlement slices, preserving clean-architecture boundaries.
- `drizzle` — copied database migration and schema history.

Read [the migration record](docs/MIGRATION.md), [component system](docs/COMPONENT_SYSTEM.md), [architecture](docs/ARCHITECTURE.md), and [product decisions](docs/PRODUCT_DECISIONS.md) before extending the product. `SPEC.md` contains earlier discovery context; confirmed decisions take precedence where they differ.

## Design notes

- Reserved neo-brutalist direction inspired by the supplied Codex Reset reference.
- Reference palette relationships: warm paper and muted ink lead; deep green anchors outlines and details, while UK-plate yellow marks primary actions and the current selection.
- Bricolage Grotesque is self-hosted from the installed font package.
- Button, Card, Badge, Accordion, and Tabs were initialized from the official `neobrutalism.dev` shadcn registry, then themed to the more restrained visual weight.
- The sticky navigation follows the visible section and moves its yellow highlight as the page scrolls.
- Landing rules remain scoped to `.landing-page`; product rules are keyed by `data-dt` attributes. Shared tokens are in `packages/tokens/src/tokens.css`.
- The product components use a prop-driven API informed by the separate styling-discipline project, without importing its incompatible purple/Tailwind 3 package.
