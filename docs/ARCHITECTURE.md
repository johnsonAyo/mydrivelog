# Architecture

## Repository and deployment

```text
AI Projects/
├── styling-discipline/          reference, retained independently
├── drivetrack/                  former product repo, untouched fallback
└── drivetrack-landing-concept/  combined product repo
```

This repository is the intended combined DriveTrack product: one Next.js application for public marketing, product UI, and API routes. The former `drivetrack` repository remains a separate fallback. `styling-discipline` is a reference, not a runtime dependency. No production database has been moved or connected by this migration.

## Application boundary

DriveTrack is one Next.js application and deployment with four explicit layers:

- **Presentation** — App Router pages, route handlers, request parsing, response mapping.
- **Application** — use cases, transaction ownership, authorisation-aware orchestration.
- **Domain** — scheduling and booking policy expressed without framework dependencies.
- **Infrastructure** — PostgreSQL repositories, provider adapters, logging, and runtime composition.

Dependencies point inward. Presentation and infrastructure may depend on application/domain contracts; domain code does not know about either.

Product components live in `packages/ui` and accept view models and action slots. They do not import repositories, fetch APIs, or own route state. Tokens live in `packages/tokens`; the approved landing page remains a separate presentation surface in the same app.

## First vertical slice

Health, readiness, and availability GET/POST/export routes exist today. Availability creation calculates an explicit end time from the workspace default when none is supplied, rejects overlap, and returns advisory buffer warnings. PostgreSQL carries a second overlap guarantee to protect concurrent requests. Calendar is the first live page and reads and writes these routes against the development database.

## Authentication boundary

In local development only, `DEV_WORKSPACE_ID` resolves a seeded workspace through the same database-backed availability routes, without a cookie or trial gate. It is disabled outside `NODE_ENV=development`. Otherwise business endpoints require an opaque session cookie whose hash resolves to an active instructor and workspace; expired unpaid workspaces are read-only. The provisional email-link issuance and verification flow exists, but production authentication remains undecided. There are no booking, release, notes, or debrief endpoints. Their isolated components in `/component-lab` are examples, not working features.

## Intended composition order

1. Keep shared tokens and product primitives independent of route data.
2. Add component states and accessibility tests as each real workflow is specified.
3. Add backend slices using presentation → application → domain/infrastructure seams.
4. Bind API-derived view models to components in the real product routes once the corresponding endpoints exist; add production authentication before launch.

See [COMPONENT_SYSTEM.md](COMPONENT_SYSTEM.md) for the inventory and [MIGRATION.md](MIGRATION.md) for what moved.
