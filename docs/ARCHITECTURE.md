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

Only health, readiness, and availability GET/POST routes exist today. Availability creation calculates an explicit end time from the workspace default when none is supplied, rejects overlap, returns advisory buffer warnings, and persists only after workspace authentication. PostgreSQL carries a second overlap guarantee to protect concurrent requests. The existing tests cover domain and use-case behavior; this migration does not claim end-to-end database coverage.

## Authentication boundary

Business endpoints accept only an opaque session cookie whose hash resolves to an active instructor and workspace. No temporary `x-user-id`, query-string identity, or hard-coded development user is allowed. Magic-link issuance and verification are not yet implemented, so the copied availability routes cannot be used through a normal new-user journey yet. There are no booking, release, notes, or debrief endpoints. Their isolated components in `/component-lab` are previews, not working features.

## Intended composition order

1. Keep shared tokens and product primitives independent of route data.
2. Add component states and accessibility tests as each real workflow is specified.
3. Add backend slices using presentation → application → domain/infrastructure seams.
4. Bind API-derived view models to components in authenticated product routes only after the corresponding endpoints exist.

See [COMPONENT_SYSTEM.md](COMPONENT_SYSTEM.md) for the inventory and [MIGRATION.md](MIGRATION.md) for what moved.
