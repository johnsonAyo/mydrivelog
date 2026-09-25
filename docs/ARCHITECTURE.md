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

Domain dependencies point inward: domain code knows nothing about Next.js, PostgreSQL, or email. App Router handlers are runtime composition roots and wire the application rules, repositories, and email adapter; they own HTTP validation and response mapping.

Product components live in `packages/ui` and accept view models and action slots. They do not import repositories, fetch APIs, or own route state. Tokens live in `packages/tokens`; the approved landing page remains a separate presentation surface in the same app.

## Live scheduling slice

The instructor's `/calendar` now composes named availability collections and exact lesson times. The workflow is draft → add/edit times (or generate them from a range) → share to a named email recipient or create a general link → book an exact time. Published collections remain editable. New times can stay private until explicitly made bookable. Booked times cannot be edited through the slot editor, and public pages show only open future times, not closed or booked times. A personal link identifies its invited recipient; a general-link visitor must verify their email before booking. Confirmed bookings appear in the instructor's collection and on the recipient's link.

`src/domain/collections/slot-policy.ts` contains framework-independent generation, overlap, and advisory-gap rules. `src/infrastructure/collections/postgres-collection-repository.ts` owns the atomic claim: workspace advisory lock, slot row lock, cross-collection and legacy-booking conflict checks, and weekly allowance. Route handlers validate and map HTTP input, and the client workspace maps API state to the prop-driven UI package. The earlier availability-window routes and tables remain intact for existing records but are no longer the main calendar editor. Email requires provider credentials; local testing can use a copied personal link when delivery is not configured.

## Authentication boundary

In local development only, `DEV_WORKSPACE_ID` resolves a seeded workspace through the same database-backed routes, without a cookie or trial gate. It is disabled outside `NODE_ENV=development`. Otherwise instructor endpoints require an opaque session cookie whose hash resolves to an active instructor and workspace; expired unpaid workspaces are read-only. The recipient-specific public booking endpoint is protected by its high-entropy link token. The provisional email-link issuance and verification flow exists, but production authentication remains undecided. Notes and debrief endpoints do not exist yet; their isolated components in `/component-lab` are examples, not working features.

## Intended composition order

1. Keep shared tokens and product primitives independent of route data.
2. Add component states and accessibility tests as each real workflow is specified.
3. Add backend slices using presentation → application → domain/infrastructure seams.
4. Bind API-derived view models to components in the real product routes once the corresponding endpoints exist; add production authentication before launch.

See [COMPONENT_SYSTEM.md](COMPONENT_SYSTEM.md) for the inventory and [MIGRATION.md](MIGRATION.md) for what moved.
