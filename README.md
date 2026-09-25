# DriveTrack

DriveTrack is an instructor-first lesson planning product. This repository combines the approved landing page, the availability backend, and an isolated product-component system. The earlier `drivetrack` repository remains untouched as a fallback; no production records or secrets were moved.

## Run locally

```bash
npm install
npm run db:seed:dev
npm run dev
```

Requires Node.js 22 or later and PostgreSQL for database-backed routes. Set `DATABASE_URL` in ignored `.env.local`, migrate with `node --env-file=.env.local ./node_modules/drizzle-kit/bin.cjs migrate`, and set a UUID `DEV_WORKSPACE_ID` in ignored `.env.development.local` before seeding. The local Neon development database is already configured and seeded in this workspace. `npm run db:seed:dev` is idempotent. Open `http://localhost:3000/calendar` for the real database-backed calendar: create an availability window, open it, edit its rules, and share recipient-specific booking links. Confirmed lessons appear on that calendar. Use `/settings/scheduling` for the instructor display name, default lesson length, travel buffer, and weekly online-booking allowance. `/component-lab` remains an isolated visual inventory using sample data, not a second application. `/api/v1/health` does not require a database; readiness and availability routes do.

The production authentication provider is not finalised. In local development only, `DEV_WORKSPACE_ID` resolves one seeded workspace without a login cookie. This bypasses the trial gate for testing the real Calendar, not for production; never set this variable in a shared or production deployment. Without the development workspace, existing session and trial controls remain in place. The existing email-link flow is provisional and is not needed for local Calendar testing.

Booking links are real, purpose-scoped, and stored only as token hashes. With `RESEND_API_KEY` and `ACCESS_EMAIL_FROM` configured, the app sends invitations and booking confirmations; without them, it reports the email as not configured and lets the instructor copy each link. `APP_BASE_URL` should be the public origin before emailing links outside local development. There is no authentication gate for the local development workspace; this is for testing only, not a public launch. The £24/month Solo price and self-serve checkout are agreed decisions, not live billing features. Debriefs, subscription checkout, production authentication, and production email/abuse controls remain to be completed.

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
