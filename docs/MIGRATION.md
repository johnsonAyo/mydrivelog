# Migration record

## Scope of this milestone

The former `drivetrack` repo's backend source, API routes, tests, database schema/migration, configuration, `SPEC.md`, and confirmed product decisions were copied into this repository. The source repo was not edited. No `.env` values, database data, deployment settings, or authenticated product pages were copied.

The migrated backend is intentionally the existing implementation, not an expansion of the spec. Implemented routes:

| Route | Current behavior |
| --- | --- |
| `GET /api/v1/health` | Process health, no database needed |
| `GET /api/v1/ready` | Database readiness |
| `GET /api/v1/availability` | Workspace-scoped open slots with session cookie |
| `POST /api/v1/availability` | Creates a slot with overlap protection and buffer warnings |

Missing backend journeys include session issuance, booking, slot release, lesson notes, and debrief. The component lab deliberately uses sample data for those areas. The copied availability route also needs a real session-issuance journey before it is usable from a fresh browser.

## Integration choices

- Kept the approved Next 16 landing page, its official neo-brutalist shadcn components, and existing visual treatment.
- Retained clean backend layer boundaries and copied the SQL migration without reinterpreting it.
- Added local `@drivetrack/tokens` and `@drivetrack/ui` workspaces. The source repo's purple/Tailwind 3 UI package was not copied because it conflicts with the approved green/yellow Tailwind 4 presentation. Its prop-driven styling discipline informed the new product component API.
- Extracted the landing palette into shared tokens without changing the landing markup.
- Added a noindex component lab before building authenticated page layouts.

## Verification and handoff

Run `npm run verify` after installation. To run database-backed routes locally, copy `.env.example` to `.env.local`, provide a new or intended PostgreSQL database, and run `node --env-file=.env.local ./node_modules/.bin/drizzle-kit push --strict` followed by `node --env-file=.env.local scripts/ensure-database-invariants.mjs`. Schema push replaces the old checked-in migration history and reapplies the overlap constraint through a repeatable script. Do not run the migration against the old production database unless that is explicitly chosen. The old repo remains a fallback until the new product journeys and real database integration are verified.

The build script uses Next's documented `--webpack` option. Turbopack's production build intermittently failed while its CSS worker tried to bind an internal port in this execution environment; Webpack completed consistently. Development still uses the default Next dev bundler.
